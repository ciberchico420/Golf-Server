import { Room, Client, Delayed } from "colyseus";
import { MapSchema } from '@colyseus/schema'
import { GameState, UserState, PowerState, Message, TurnPlayerState, V3, ObjectState, BoxObject, WorldState } from "../schema/GameRoomState";
import { MWorld } from "../world/world";
import { SUser } from "../schema/SUser";
import _, { isNil } from 'lodash';
import CANNON, { Vec3, Quaternion } from 'cannon';
import { MapsRoom } from "./MapsRoom";
import { Collection } from "mongoose";
import { BoxModel, SphereModel } from "../db/DataBaseSchemas";
import { AddOneShot_Power } from "./powers/AddOneShot_Power";
import { CreateBox_Power } from "./powers/CreateBox_Power";
import { FlashEnemies_Power } from "./powers/FlashEnemies_Power";
import { Power } from "./powers/Power";
import { c } from "../c";

export class GameRoom extends Room {
  delayedInterval: Delayed;
  public world: MWorld;
  public users = new Map<string, SUser>();
  public State: GameState;;
  public gameControl: GameControl;


  onCreate(options: any) {

    this.clock.start();

    this.setState(new GameState());
    this.State = this.state;

    this.world = new MWorld(this, this.state);
    var esto = this;

    // this.changeMap();

    this.onMessage("setName", (client, message) => {

      this.state.name = message;
    });



    this.readMessages();

    this.delayedInterval = this.clock.setInterval(() => {
      this.tick();
    }, 10);


  }

  changeMap(name: string) {
    console.log("change map")
    this.world.sobjects.forEach(ob => {
      this.world.deleteObject(ob);
    })
    this.world.generateMap(name, null);
    this.users.forEach(user => {
      user.client.send("changeMap", null);
      this.createUser(user.client);
    })
    this.State.winner = null;


  }

  readMessages() {
    this.onMessage("shoot", (client, message) => {
      this.users.get(client.sessionId).golfball.setRotationQ(message.rotx, message.roty, message.rotz, message.rotw);
      var potency = message.force * 50;
      var potency2 = message.force * 30;

      var jumpForce = 2.2;


      this.State.turnState.players[client.sessionId].shots -= 1;
      this.State.turnState.players[client.sessionId].ballisMoving = true;
      this.users.get(client.sessionId).golfball.body.applyLocalImpulse(new CANNON.Vec3(
        0,
        (-message.contacty * potency) * jumpForce,
        (potency)
      ),

        new CANNON.Vec3(-message.contactx * potency2, 0, 0));



    })

    this.onMessage("stop", (client, message) => {
      this.stopBall(this.users.get(client.sessionId).userState);
      //this.changeMap("mapa2");
    })


    this.onMessage("chat", (client, message) => {
      var mes = new Message();
      mes.user = this.State.users[client.id];
      mes.message = message;
      this.State.chat.messages.push(mes);
    });

  }

  stopBall(user: UserState) {
    this.users.get(user.sessionId).golfball.body.velocity = new Vec3(0, 0, 0);
    this.users.get(user.sessionId).golfball.body.angularVelocity = new Vec3(0, 0, 0);
    //this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.angularDamping = 0;
    this.users.get(user.sessionId).golfball.body.quaternion = new Quaternion(0, 0, 0, 1);
  }

  public setWinner(winnerBall: ObjectState) {

    this.State.winner = winnerBall.owner;
  }
  onJoin(client: Client, options: any) {

    if (this.users.size == 0) {
      this.world.generateMap("mapa", null)
      this.gameControl = new GameControl(this);
    }
    this.createUser(client);

  }

  createUser(client: Client) {
    var us = new UserState();
    us.sessionId = client.sessionId;

    var su = new SUser(client, this, us);

    this.users.set(client.sessionId, su);

    this.State.users[client.sessionId] = us;

    this.State.turnState.players[client.sessionId] = new TurnPlayerState();
    this.State.turnState.players[client.sessionId].user = us;

    this.State.turnState.players[client.sessionId].bag.owner = us;

    console.log("Welcome to " + client.sessionId);

    return su;
  }

  stopVelocity = 380.8;
  stopAngularVelocity = 1.8;

  ballsStatic(user: UserState) {

    var bodyVel = this.users.get(user.sessionId).golfball.body.velocity;
    var angularVelocity = this.users.get(user.sessionId).golfball.body.angularVelocity;
    if (
      bodyVel.z <= this.stopVelocity && bodyVel.z >= -this.stopVelocity &&
      bodyVel.x <= this.stopVelocity && bodyVel.x >= -this.stopVelocity &&
      bodyVel.y <= this.stopVelocity - 5 && bodyVel.y >= -(this.stopVelocity - 5) &&
      angularVelocity.x <= this.stopAngularVelocity && angularVelocity.x >= -this.stopAngularVelocity &&
      angularVelocity.y <= this.stopAngularVelocity && angularVelocity.y >= -this.stopAngularVelocity &&
      angularVelocity.z <= this.stopAngularVelocity && angularVelocity.z >= -this.stopAngularVelocity
    ) {
      return true;
    }
    return false;
  }

  tick() {

    if (this.world.ballSpawn) {
      this.world.tick(Date.now());
      this.gameControl.tick();
    }

  }



  onLeave(client: Client, consented: boolean) {
    var user = this.users.get(client.sessionId);
    // delete (<GameState>this.state).world.objects[client.sessionId];
    this.world.cworld.remove(user.golfball.body);
    delete (<GameState>this.state).turnState.players[client.sessionId];
  }

  onDispose() {
  }

}

class GameControl {
  gameRoom: GameRoom;
  newTurn: boolean = true;
  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
  }

  tick() {

    this.checkIfBallsFalling();
    var shotsCount = 0;
    var stoppedCount = 0;

    this.gameRoom.users.forEach(user => {
      var playerS = this.gameRoom.State.turnState.players[user.userState.sessionId];

      //Stop the ball before ballIsMoving becomes true.
      if (playerS != null) {
        if (this.gameRoom.ballsStatic(user.userState) && this.gameRoom.State.turnState.players[user.userState.sessionId].ballisMoving) {
          this.gameRoom.stopBall(user.userState);
        }
        if (playerS.shots == 0) {
          shotsCount++;
        }
        if (this.gameRoom.ballsStatic(user.userState)) {
          stoppedCount++;
          this.gameRoom.State.turnState.players[user.userState.sessionId].ballisMoving = false;
        }

        if (this.newTurn) {
          this.gameRoom.stopBall(user.userState);
          this.newTurn = false;
        }
      }


    });
    if (shotsCount == this.gameRoom.users.size && stoppedCount == this.gameRoom.users.size && !this.newTurn) {
      //Everyone shoot
      this.nextTurn(false);
      this.newTurn = true;
    }

    this.checkWinner();
  }

  checkWinner() {
    if (this.gameRoom.State.winner != null) {
      this.gameRoom.changeMap("mapa2");
    }
  }

  //newMap() {

  /*
  this.gameRoom.State.winner = null;
  this.gameRoom.State.turnState.turn = 0;
  this.newTurn = true;
  this.nextTurn(true);*/
  // }
  //Check if any ball is falling and it places it to the ball spawn position.
  checkIfBallsFalling() {
    this.gameRoom.users.forEach(element => {
      if (element.golfball.body.position.y < -0.5) {

        var checkpoint = this.gameRoom.State.turnState.players[element.client.sessionId].checkpoint;

        if (checkpoint.x == undefined && checkpoint.y == undefined && checkpoint.y == undefined) {
          checkpoint.x = this.gameRoom.world.ballSpawn.x;
          checkpoint.y = this.gameRoom.world.ballSpawn.y;
          checkpoint.z = this.gameRoom.world.ballSpawn.z;
        }
        this.gameRoom.stopBall(element.userState);
        element.golfball.setPosition(checkpoint.x, checkpoint.y, checkpoint.z);
      }
    });
  }
  generateShop():MapSchema<PowerState>{
    var shopSize = 3;
    var list:Array<Power> = [new AddOneShot_Power(this.gameRoom),new CreateBox_Power(this.gameRoom),new FlashEnemies_Power(this.gameRoom)]

    var map:MapSchema<PowerState> = new MapSchema<PowerState>();
    for(var a:number = 0; a<= shopSize;a++){
      map[list[a].uniqueID] = list[a].giveState();
    }

    return map;
  }
  addTurnsGems(player:TurnPlayerState):number{
    var gems = this.gameRoom.State.turnState.players[player.user.sessionId].gems;
    gems += this.gameRoom.State.turnState.gemsPerTurn;

    return gems;
  }
  nextTurn(deleteCheckPoint: boolean) {
    this.gameRoom.users.forEach(user => {
      var checkpoint = this.gameRoom.State.turnState.players[user.userState.sessionId].checkpoint;
       var gems = this.addTurnsGems(this.gameRoom.State.turnState.players[user.userState.sessionId])


      var turnplayer = this.gameRoom.State.turnState.players[user.userState.sessionId] = new TurnPlayerState();
      turnplayer.user = user.userState;
      turnplayer.gems = gems;
      turnplayer.checkpoint = checkpoint;
      turnplayer.bag.shop = this.generateShop();

      



    });
    this.gameRoom.State.turnState.turn += 1;
  }

}
