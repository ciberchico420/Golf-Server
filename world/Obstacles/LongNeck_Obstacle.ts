import { Obstacle } from "../Obstacles/Obstacle";
import { Delayed, Room } from "colyseus";
import { ObjectState, ObstacleState, V3 } from "../../schema/GameRoomState";
import { c } from "../../c";
import { GameRoom } from "../../rooms/GameRoom";
import { SphereModel } from "../../db/DataBaseSchemas";
import CANNON,{ Vec3 } from "cannon";



export class LongNeck_Obstacle extends Obstacle {

    state: ObstacleState = new ObstacleState();

    actionDelayed:Delayed;
    constructor(room: GameRoom, objectState: ObjectState) {
        super(room, objectState);
        this.state.uID = this.objectState.uID;
         this.actionDelayed =  room.clock.setInterval(()=>{
          this.state.status = "start";
          console.log("Longneck broadcast");
          this.room.broadcast("LongNeck", this.state);
          this.room.clock.setTimeout(() => {
            if(this.room.world.sObstacles.size > 0){
              this.createEgg();
            }
            
          }, 3000)
         }, 6000);
    }

    destroy(){
      super.destroy();
      this.actionDelayed.clear();
      console.log("Destroy LongNeck_Obstacle");
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
        sobj.setRotationQ(this.objectState.quaternion.x,this.objectState.quaternion.y,this.objectState.quaternion.z,this.objectState.quaternion.w);

        var sobj2 = this.room.world.createSphere(model2, null);
        sobj2.changeMass(.5);
        sobj2.setPosition(this.room.world.extraPoints[0].x, this.room.world.extraPoints[0].y+4, this.room.world.extraPoints[0].z);
        sobj2.setRotationQ(this.objectState.quaternion.x,this.objectState.quaternion.y,this.objectState.quaternion.z,this.objectState.quaternion.w);

        var cons = new CANNON.LockConstraint(sobj.body, sobj2.body);
        this.room.world.cworld.addConstraint(cons);
      //  world.addConstraint(c);

        sobj.body.applyLocalImpulse(new Vec3(0, 0, 80), new Vec3(0, 0, 0));

        
        this.room.clock.setTimeout(() => {
          if(this.room.world.sobjects.has(sobj.uID) || this.room.world.sobjects.has(sobj2.uID) )
          this.room.world.deleteObject(sobj);
          this.room.world.deleteObject(sobj2);
      }, 30000);



    }
}


