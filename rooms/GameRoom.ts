import { Room, Client, Delayed } from "colyseus";
import { MapSchema } from '@colyseus/schema'
import { GameState, UserState, BagState, Power, Message } from "../schema/GameRoomState";
import { MWorld } from "../world/world";
import { SUser } from "../schema/User";
import _ from 'lodash';
import CANNON, { Vec3, Quaternion } from 'cannon';
import { MapsRoom } from "./MapsRoom";

export class GameRoom extends Room {

  delayedInterval: Delayed;
  public world: MWorld;
  public users = new Map<string, SUser>();
  public State: GameState;;
  initialShots: number = 2;


  onCreate(options: any) {

    this.clock.start();

    this.setState(new GameState());
    this.State = this.state;

    this.world = new MWorld(this, this.state);

    this.onMessage("setName", (client, message) => {

      this.state.name = message;
    });

    this.readMessages();

    this.delayedInterval = this.clock.setInterval(() => {
      this.tick();
    }, 50);


  }

  readMessages() {
    this.onMessage("shoot", (client, message) => {
      this.users.get(client.sessionId).golfball.body.quaternion = new Quaternion(0, 0, 0, 1);
      this.users.get(client.sessionId).golfball.body.applyLocalImpulse(new CANNON.Vec3(
        (message.x) * message.force,
        -((message.y) * message.force),
        (message.z) * message.force
      ),
        new CANNON.Vec3(0, 1, 0));
      this.ownerShoot();


    })

    this.onMessage("stop", (client, message) => {

      this.stopBall();
      
    })

    this.onMessage("usepower", (client, message) => {
      var bag = (<BagState>this.State.bags[client.sessionId]);
      var bagTurn = (<BagState>this.State.bags[this.State.turnState.turnOwner.sessionId]);
      var power: Power = bag.objects[message.uID];
      var newPo = new Power();
      Object.assign(newPo, power);
      bagTurn.active[newPo.uID] = newPo;
      power.listUsers[this.State.turnState.turnOwner.sessionId] = this.State.users[this.State.turnState.turnOwner.sessionId];

      this.activatePower(power, bag);

      delete bag.objects[message.uID];

    });

    this.onMessage("chat",(client,message)=>{
      var mes = new Message();
      mes.user = this.State.users[client.id];
      mes.message = message;
      this.State.chat.messages.push(mes);
    });

  }

  ownerShoot() {
    this.State.turnState.ownerShoot = true;
    for (const key in this.State.bags) {
      var bag: BagState = this.State.bags[key];
      for (const key in bag.active) {
        var activePower: Power = bag.active[key];
        this.activatePower(activePower, bag);
      }
    }
  }


  nextTurn() {
    this.State.turnState.ownerShoot = false;


    if (this.State.turnState.turn >= this.State.turnState.turnOrder.length - 1) {
      this.State.turnState.turn = 0;
    } else {
      this.State.turnState.turn += 1;
    }

    this.State.turnState.turnOwner = this.users.get(this.State.turnState.turnOrder[this.State.turnState.turn]).userState;
    this.State.turnState.shotsAvaible = this.initialShots;


    //console.log();
  }
  stopBall(){
    this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.velocity = new Vec3(0, 0, 0);
    this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.angularVelocity = new Vec3(0, 0, 0);
    this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.quaternion = new Quaternion(0, 0, 0, 1);
  }

  activatePower(power: Power, bag: BagState) {
    if (power.turns == 1) {
      this.deletePower(power, bag);
    }
    power.turns -= 1;

    if (power.type = "addmass") {

      for (const key in power.listUsers) {
        if (power.listUsers.hasOwnProperty(key)) {
          const user = power.listUsers[key];
          this.users.get(user.sessionId).golfball.changeMass(SUser.golfMass+5);
          console.log("Acivate power ADDMASS");
        }
      }

    }
  }

  deletePower(power: Power, bag: BagState) {

    console.log("Delete power");
    for (const key in power.listUsers) {
      if (power.listUsers.hasOwnProperty(key)) {
        const user = power.listUsers[key];

        power.listUsers = new MapSchema<UserState>();
        // delete bag.active[power.uID];
        this.users.get(user.sessionId).golfball.changeMass(SUser.golfMass);
        console.log("Setting back");
      }
    }
    delete bag.active[power.uID];
  }
  onJoin(client: Client, options: any) {
    var us = new UserState();
    us.sessionId = client.sessionId;

    var su = new SUser(client, this, us);

    this.State.bags[client.sessionId] = new BagState();
    this.State.bags[client.sessionId].owner = us;

    this.users.set(client.sessionId, su);


    this.State.users[client.sessionId] = us;
    this.State.turnState.turnOrder.push(us.sessionId);

    if ((<GameState>this.state).turnState.turnOwner == undefined) {
      (<GameState>this.state).turnState.turnOwner = us;
    }


    console.log("Welcome " + client.sessionId);

  }

  stopVelocity = 1;

  ballsStatic() {
    var bodyVel = this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.velocity;
    var otherVel = this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.angularVelocity;
    if (bodyVel.x < this.stopVelocity && bodyVel.z < this.stopVelocity && bodyVel.y < this.stopVelocity
      && Math.abs(otherVel.x) < this.stopVelocity + 2 && Math.abs(otherVel.z) < this.stopVelocity + 2) {
      return true;
    }
    return false;
  }

  tick() {
    if (this.world.ballSpawn) {
      this.world.tick();

      if (this.State.turnState.ownerShoot && this.ballsStatic()) {
        // console.log(otherVel);

        if (this.State.turnState.shotsAvaible == 1) {
          
          this.nextTurn();
          this.stopBall();
          
        } else {
          this.stopBall();
          this.State.turnState.shotsAvaible -= 1;
          this.State.turnState.ownerShoot = false;
          
        }

      }



      this.checkIfBallsFalling();
    }

  }

  checkIfBallsFalling() {
    this.users.forEach(element => {
      if (element.golfball.body.position.y < -5.5) {
        element.golfball.setPosition(this.world.ballSpawn.x, this.world.ballSpawn.y, this.world.ballSpawn.z);
        if (element.userState.sessionId == this.State.turnState.turnOwner.sessionId) {
          this.ownerShoot();
        }
      }

    });
  }

  onLeave(client: Client, consented: boolean) {

    var user = this.users.get(client.sessionId);
    delete (<GameState>this.state).world.objects[user.golfball.body.id];
    this.world.cworld.remove(user.golfball.body);
    this.State.turnState.turnOrder.splice(this.State.turnState.turnOrder.indexOf(client.id), 1);

    if (this.State.turnState.turnOwner.sessionId == client.sessionId) {
      this.nextTurn();
    }

  }

  onDispose() {
  }

}
