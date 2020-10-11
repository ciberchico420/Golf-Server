import { Obstacle } from "../Obstacles/Obstacle";
import { Delayed, Room } from "colyseus";
import { ObjectState, ObstacleControllerState, ObstacleState, V3 } from "../../schema/GameRoomState";
import { c } from "../../c";
import { GameRoom } from "../../rooms/GameRoom";
import { SphereModel } from "../../db/DataBaseSchemas";
import CANNON, { Vec3 } from "cannon";
import { SObject } from "../SObject";



export class LongNeck_Obstacle extends Obstacle {

  state: ObstacleControllerState = new ObstacleControllerState();

  actionDelayed: Delayed;

  createEggTick = 0;
  createEggTime = 260;

  broadCastTick = 0;
  broadCastTime = 400;
  eggs: Map<string, Egg> = new Map<string, Egg>();
  creatingEgg: boolean = false;
  extraPoints:Array<{x:Number,y:Number,z:Number}>
  constructor(room: GameRoom, objectState: ObstacleState,extraPoints:Array<{x:Number,y:Number,z:Number}>) {
    super(room, objectState);
    this.state.uID = this.objectState.uID;
    this.extraPoints = extraPoints;
    this.broadCastTime= this.randomNum();
  }

  randomNum(){
    return Math.floor(c.getRandomNumber(200,700));
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
        this.broadCastTime= this.randomNum();
      }
    }

    this.eggs.forEach(egg => {

      egg.tick();
    });

  }

  createEgg() {
    var random = c.getRandomNumber(0,3);
    var model = new SphereModel({ uID: c.uniqueId() })
    model.position = c.initializedV3();
    model.quat = c.initializedQuat();
    model.radius = 4+random;
    model.type = "egg1"
    model.instantiate = true;
    model.mesh = "dinosaurs/Egg";

    var model2 = new SphereModel({ uID: c.uniqueId() })
    model2.position = c.initializedV3();
    model2.quat = c.initializedQuat();
    model2.radius = 3+random;
    model2.type = "egg2"
    model2.instantiate = false;

    var sobj = this.room.world.createSphere(model, null);
    sobj.changeMass(.07);
    sobj.setPosition(this.extraPoints[0].x as number, this.extraPoints[0].y as number, this.extraPoints[0].z as number);
    sobj.setRotationQ(this.objectState.quaternion.x, this.objectState.quaternion.y, this.objectState.quaternion.z, this.objectState.quaternion.w);

    var sobj2 = this.room.world.createSphere(model2, null);
    sobj2.changeMass(.01);
    sobj2.setPosition(this.extraPoints[0].x as number, this.extraPoints[0].y as number + 4, this.extraPoints[0].z as number) ;
    sobj2.setRotationQ(this.objectState.quaternion.x, this.objectState.quaternion.y, this.objectState.quaternion.z, this.objectState.quaternion.w);

    var cons = new CANNON.LockConstraint(sobj.body, sobj2.body);
    this.room.world.cworld.addConstraint(cons);
    //  world.addConstraint(c);
    var rand = c.getRandomNumber(2,6);
    var randx = c.getRandomNumber(-3,3);
    sobj.body.applyLocalImpulse(new Vec3(randx,2,rand), new Vec3(0, 1, 0));
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


