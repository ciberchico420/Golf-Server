import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema } from '@colyseus/schema'
import { GameState, UserState, PowerState, Message, TurnPlayerState, V3, ObjectState, BoxObject, WorldState } from "../schema/GameRoomState";
import { MWorld } from "../world/world";
import { SUser } from "../world/SUser";
import _, { isNil, toInteger } from 'lodash';
import CANNON, { Vec3, Quaternion, World } from 'cannon';
import { BoxModel, SphereModel } from "../db/DataBaseSchemas";
import { AddOneShot_Power } from "./powers/AddOneShot_Power";
import { CreateBox_Power } from "./powers/CreateBox_Power";
import { FlashEnemies_Power } from "./powers/FlashEnemies_Power";
import { Power } from "./powers/Power";
import { c } from "../c";
import { Obstacle } from "../world/Obstacles";
import { SWorker } from "./SWorker";
import { Worker } from 'worker_threads';

export class GameRoom extends Room {
  delayedInterval: any;
  public users = new Map<string, SUser>();
  public State: GameState;
  worker: Worker;
  world:MWorld;
  public gameControl: GameControl;
  maxClients = 1;

  public ObstaclesListening: Array<Obstacle> = new Array<Obstacle>(0);
  public PowersListening: Array<Power> = new Array<Power>(0);
  public WorkersListening: Array<SWorker> = new Array<SWorker>(0);

  worldConnector: WorlConnector;


  onCreate(options: any) {

    this.clock.start();

    this.setState(new GameState());
    this.State = this.state;


    this.readMessages();

   this.world = new MWorld(this,this.state);
    this.delayedInterval = setInterval(() => this.tick(), 10);

     this.clock.setInterval(() => {
       this.world.updateState();
     }, 50);
  }

  addObstacleListener(ob: Obstacle) {
    this.ObstaclesListening.push(ob);
  }
  addPowerListener(ob: Power) {
    this.PowersListening.push(ob);
  }
  addWorkerListener(ob: SWorker) {
    this.WorkersListening.push(ob);
  }

  removeObstacleListener(ob: Obstacle) {
    var index = this.ObstaclesListening.indexOf(ob)
    this.ObstaclesListening.splice(index, 1);
  }

  removePowerListener(ob: Power) {
    var index = this.PowersListening.indexOf(ob)
    this.PowersListening.splice(index, 1);
  }
  removeWorkerListener(ob: SWorker) {
    var index = this.WorkersListening.indexOf(ob)
    this.WorkersListening.splice(index, 1);
  }

  changeMap(name: string) {
    /*console.log("Changin map to -" + name)
    this.world.sobjects.forEach(ob => {
      if (ob.objectState.type != "golfball") {
        this.world.deleteObject(ob);
      }

    })

    this.world.sObstacles.forEach(ob => {
      ob.destroy();
    })
    this.world.generateMap(name, null);
    this.State.winner = null;

    this.broadcast("changeMap");
*/

  }

  readMessages() {
    this.onMessage("setName", (client, message) => {
      this.state.name = message;
    });
    this.onMessage("shoot", (client, message) => {
      this.users.get(client.sessionId).shootBall(message);
    })

    this.onMessage("stop", (client, message) => {
      this.stopBall(this.users.get(client.sessionId).userState);
    })
    this.onMessage("buy-power", (client, message: PowerState) => {
      this.gameControl.buyPower(client, message);
    })
    this.onMessage("activate-power", (client, message: PowerState) => {
      this.gameControl.activatePower(client, message);
    })


    this.onMessage("chat", (client, message) => {
      var mes = new Message();
      mes.user = this.State.users[client.id];
      mes.message = message;
      this.State.chat.messages.push(mes);
    });


    this.onMessage("move", (client, message) => {
      var player = this.users.get(client.sessionId).player;
      player.move(message.x, message.y, message.rotX, message.rotZ);
      if (player != undefined) {
        player.move(message.x, message.y, message.rotX, message.rotZ);
      }
    });

    this.onMessage("rotate", (client, message) => {
      var player = this.users.get(client.sessionId).player;
      if (player != undefined) {
        this.users.get(client.sessionId).player.rotate(message);
      }

    });
    this.onMessage("moveR", (client, message) => {
      var player = this.users.get(client.sessionId).player;
      if (player != undefined) {
        player.move(c.getRandomNumber(-1, 1), c.getRandomNumber(-1, 1), 0, 0);
        this.users.get(client.sessionId).shootBallRandom();
      }

    }
    )

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
    var user = this.createUser(client);

    //Change to something with user input.
    if (this.users.size == 1) {
       this.world.generateMap("mapa", null)
      this.gameControl = new GameControl(this);
      this.gameControl.startGame();
      this.getTurnPlayer(client.sessionId).bag.shop = this.gameControl.generateShop(this.users.get(client.sessionId));
    }

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
    // new SWorker(this).setTimeout(()=>{su.createObjects()},10);
    su.createObjects();
    return su;
  }

  getTurnPlayer(sessionID: string): TurnPlayerState {
    return this.State.turnState.players[sessionID];
  }

  stopVelocity = 30.8;
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
    this.ObstaclesListening.forEach(obs => {
      obs.tick();
    });
    this.WorkersListening.forEach(wrk => {
      wrk.tick();
    })
    this.PowersListening.forEach(obs => {
      obs.tick();
    });

    }

  }



  onLeave(client: Client, consented: boolean) {
    console.log("Loging out " + client.sessionId);
    var user = this.users.get(client.sessionId);
    user.leave()
    delete this.State.turnState.players[client.sessionId];
    this.users.delete(client.sessionId);
    //delete this.State.world.objects[client.sessionId];
  }

  onDispose() {
    clearInterval(this.delayedInterval);
    this.clock.clear();
  }

}

class GameControl {
  gameRoom: GameRoom;
  newTurn: boolean = true;
  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
  }

  public startGame() {
    // this.nextTurn(false);
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
        //console.log("Players shots",playerS.shots)
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

    //console.log("Shot count",shotsCount,"StoppedCount",stoppedCount);


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

  resetBallSpawn(user: SUser) {
    var checkpoint = this.gameRoom.State.turnState.players[user.client.sessionId].checkpoint;

    if (checkpoint.x == 0 && checkpoint.y == 0 && checkpoint.y == 0) {
      /* checkpoint.x = this.gameRoom.world.ballSpawn.x;
       checkpoint.y = this.gameRoom.world.ballSpawn.y;
       checkpoint.z = this.gameRoom.world.ballSpawn.z;*/
      this.gameRoom.State.turnState.players[user.client.sessionId].checkpoint = checkpoint;
    }
    this.gameRoom.stopBall(user.userState);
    user.golfball.setPosition(checkpoint.x, checkpoint.y, checkpoint.z);

  }

  //Check if any ball is falling and it places it to the ball spawn position.
  checkIfBallsFalling() {
    this.gameRoom.users.forEach(element => {
      if (element.golfball.body.position.y < -50.5) {

        this.resetBallSpawn(element);
      }
    });
  }
  generateShop(owner: SUser): ArraySchema<PowerState> {
    var shopSize = 3;
    var list: Array<Power> = [new AddOneShot_Power(this.gameRoom), new CreateBox_Power(this.gameRoom), new FlashEnemies_Power(this.gameRoom)]
    //owner.shop = new Map<string, Power>();
    var map: ArraySchema<PowerState> = new ArraySchema<PowerState>();
    for (var a: number = 0; a < shopSize; a++) {
      var random = toInteger(c.getRandomNumber(0, list.length));
      var pO: Power = list[random];
      pO.uniqueID = c.uniqueId();
      pO.powerState.uID = pO.uniqueID;
      map[a] = pO.giveState();
      owner.shop.set(pO.uniqueID, pO);
    }

    return map;
  }

  buyPower(client: Client, message: PowerState) {
    var tps: TurnPlayerState = this.gameRoom.State.turnState.players[client.sessionId];
    var powerState: PowerState = Power.load(new PowerState(), message);

    if (tps.gems - message.cost >= 0) {
      tps.gems -= message.cost;

      var enofspace = false;

      for (var a = 0; a < 3; a++) {
        if (tps.bag.slots[a] == null || tps.bag.slots[a].uID == "empty") {

          var shopPower = this.gameRoom.users.get(client.sessionId).shop.get(powerState.uID);
          powerState.uID = c.uniqueId();

          tps.bag.slots[a] = powerState;

          let cloned = shopPower.clone();
          cloned.uniqueID = powerState.uID;
          this.gameRoom.users.get(client.sessionId).bag.set(powerState.uID, cloned);
          this.gameRoom.users.get(client.sessionId).bag.get(powerState.uID).slot = a;
          this.gameRoom.users.get(client.sessionId).bag.get(powerState.uID).uniqueID = powerState.uID;
          this.gameRoom.users.get(client.sessionId).bag.get(powerState.uID).powerState.uID = powerState.uID;
          enofspace = true;
          break;
        }
      }

      if (!enofspace) {
        client.send("error", "Not enough space in your bag.")
      }
    } else {
      client.send("error", "Not enough gems to buy this item.")
    }
  }

  activatePower(client: Client, message: PowerState) {
    var power: Power = this.gameRoom.users.get(client.sessionId).bag.get(message.uID);

    //  var power:Power = new (powers[message.type].constructor as any)(this);
    power.setOwner(this.gameRoom.users.get(client.sessionId))
    //power.uniqueID = c.uniqueId();
    power.powerState = Power.load(new PowerState(), message);
    // console.log(power,powers[message.type]);
    power.activate();
  }


  addTurnGems(player: TurnPlayerState): number {
    var gems = this.gameRoom.State.turnState.players[player.user.sessionId].gems;
    gems += this.gameRoom.State.turnState.gemsPerTurn;

    return gems;
  }
  nextTurn(deleteCheckPoint: boolean) {
    this.gameRoom.users.forEach(user => {
      var olderPlayer: TurnPlayerState = this.gameRoom.State.turnState.players[user.userState.sessionId];
      var checkpoint = olderPlayer.checkpoint;
      var gems = this.addTurnGems(olderPlayer)
      var slots = olderPlayer.bag.slots;



      var turnplayer = this.gameRoom.State.turnState.players[user.userState.sessionId] = new TurnPlayerState();
      turnplayer.user = user.userState;
      turnplayer.gems = gems;
      turnplayer.checkpoint = checkpoint;
      turnplayer.bag.shop = this.generateShop(user);
      turnplayer.bag.slots = slots;
      // console.log(turnplayer.bag.shop.);
    });

    this.gameRoom.State.turnState.turn += 1;
  }


}

class WorlConnector {
  room: GameRoom;
  worker: Worker;
  constructor(room: GameRoom, worker: Worker) {
    this.room = room;
    this.worker = worker;
  }
 // createBox(createBox(o: WBox, client: Client)
}