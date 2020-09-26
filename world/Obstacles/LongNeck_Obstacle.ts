import { Obstacle } from "../Obstacles/Obstacle";
import { Delayed, Room } from "colyseus";
import { ObjectState, ObstacleState, V3 } from "../../schema/GameRoomState";
import { c } from "../../c";
import { GameRoom } from "../../rooms/GameRoom";
import { SphereModel } from "../../db/DataBaseSchemas";
import CANNON, { Vec3 } from "cannon";
import { SObject } from "../SObject";



export class LongNeck_Obstacle extends Obstacle {

  state: ObstacleState = new ObstacleState();

  actionDelayed: Delayed;

  createEggTick = 0;
  createEggTime = 260;

  broadCastTick = 0;
  broadCastTime = 400;
  eggs: Map<string, Egg> = new Map<string, Egg>();
  creatingEgg: boolean = false;
  
  constructor(room: GameRoom, objectState: ObjectState) {
    super(room, objectState);
    this.state.uID = this.objectState.uID;
  }

  tick() {
    if (this.broadCastTick == this.broadCastTime) {
      this.state.status = "start";
      this.room.broadcast("LongNeck", this.state);
      this.creatingEgg = true;

    } else {
      this.broadCastTick++;
    }

    if (this.creatingEgg) {
      this.createEggTick += 1;
      if (this.createEggTick == this.createEggTime) {
        this.createEgg();
        this.createEggTick = 0;
        this.broadCastTick = 0;
        this.creatingEgg = false;
      }
    }

    this.eggs.forEach(egg => {

      egg.tick();
    });

  }

  createEgg() {
    var model = new SphereModel({ uID: c.uniqueId() })
    model.position = c.initializedV3();
    model.quat = c.initializedQuat();
    model.radius = 4;
    model.type = "egg1"
    model.instantiate = true;

    var model2 = new SphereModel({ uID: c.uniqueId() })
    model2.position = c.initializedV3();
    model2.quat = c.initializedQuat();
    model2.radius = 3;
    model2.type = "egg2"
    model2.instantiate = false;

    var sobj = this.room.world.createSphere(model, null);
    sobj.changeMass(.7);
    sobj.setPosition(this.room.world.extraPoints[0].x, this.room.world.extraPoints[0].y, this.room.world.extraPoints[0].z);
    sobj.setRotationQ(this.objectState.quaternion.x, this.objectState.quaternion.y, this.objectState.quaternion.z, this.objectState.quaternion.w);

    var sobj2 = this.room.world.createSphere(model2, null);
    sobj2.changeMass(.5);
    sobj2.setPosition(this.room.world.extraPoints[0].x, this.room.world.extraPoints[0].y + 4, this.room.world.extraPoints[0].z);
    sobj2.setRotationQ(this.objectState.quaternion.x, this.objectState.quaternion.y, this.objectState.quaternion.z, this.objectState.quaternion.w);

    var cons = new CANNON.LockConstraint(sobj.body, sobj2.body);
    this.room.world.cworld.addConstraint(cons);
    //  world.addConstraint(c);
    var rand = c.getRandomNumber(-30,30);
    sobj.body.applyLocalImpulse(new Vec3(rand, rand, 70+rand), new Vec3(0, 0, 0));
    this.eggs.set(sobj.uID, new Egg(sobj, sobj2, this.room, this))
  }
}

class Egg {
  egg1: SObject;
  egg2: SObject;
  lifeTime: number = 2000;
  room: GameRoom;
  longneck: LongNeck_Obstacle;
  constructor(egg1: SObject, egg2: SObject, room: GameRoom, longNeck: LongNeck_Obstacle) {
    this.egg1 = egg1;
    this.egg2 = egg2;
    this.room = room;
    this.longneck = longNeck;

    egg1.body.addEventListener("collide",(e:any)=>{
      this.collide(e,egg1);
    })
    egg2.body.addEventListener("collide",(e:any)=>{
      this.collide(e,egg2);
    })
  }

  collide(e:any,eggPart:SObject){
    this.room.world.sobjects.forEach(element => {
      var object:SObject ;
      if (e.body.id == element.body.id) {
          //console.log("Found",element);
          object = element;
      }
      if(object != undefined){
        if (object.objectState.type == "golfball") {
          var rand = c.getRandomNumber(-5,5);
          var randForce = c.getRandomNumber(30,100)
        object.body.applyLocalImpulse(new Vec3(0,rand*randForce,0),new Vec3(rand,rand,rand));

        console.log("Collided with egg");
        this.lifeTime = 30;
        //this.destroy();
      }
      }
      
  });
  }

  tick() {
    this.lifeTime -= 1;
    if (this.lifeTime <= 0) {
      this.longneck.eggs.delete(this.egg1.uID);
      this.destroy();

    }
  }

  destroy() {
    if (this.room.world.sobjects.has(this.egg1.uID) || this.room.world.sobjects.has(this.egg2.uID)) {
      this.room.world.deleteObject(this.egg1);
      this.room.world.deleteObject(this.egg2);
    }

  }
}


