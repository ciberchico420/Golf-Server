import {  ObjectMessage, ObjectState, Quat } from "../schema/GameRoomState";
import CANNON,{ Quaternion, Vec3, World } from "cannon";
import { Client } from "colyseus";
import { c } from "../c";
import { GameRoom } from "../rooms/GameRoom";
import { MWorld } from "../world/world";
import { QuixRoom } from "../rooms/QuixRoom";
import { SWorld } from "./world2";

export class WObject {
    body: CANNON.Body;
    objectState: ObjectState;
    uID:string;
    lastPosition:Vec3;
    lastRotation:Quaternion;
    needUpdate= false;
    world: SWorld;
    constructor(bodyState: ObjectState, body: CANNON.Body,world:SWorld) {
        this.world = world;
        this.body = body;
        this.objectState = bodyState;

        this.uID = bodyState.uID
    }

    changeMass(newMass:number){
        this.body.mass = newMass;
        this.body.updateMassProperties();
    }

    setPosition(x: number, y: number, z: number) {
        this.body.position = new Vec3(x, y, z);

        this.objectState.position.x = x;
        this.objectState.position.y = y;
        this.objectState.position.z = z;
    }

    setRotation(x: number, y: number, z: number) {
        this.body.quaternion.setFromEuler(x, y, z);
        this.objectState.quaternion.x = this.body.quaternion.x;
        this.objectState.quaternion.y = this.body.quaternion.y;
        this.objectState.quaternion.z = this.body.quaternion.z;
        this.objectState.quaternion.w = this.body.quaternion.w;
    }

    setRotationQ(x: number, y: number, z: number,w:number) {
        this.body.quaternion.set(x,y,z,w);
        this.objectState.quaternion.x = this.body.quaternion.x;
        this.objectState.quaternion.y = this.body.quaternion.y;
        this.objectState.quaternion.z = this.body.quaternion.z;
        this.objectState.quaternion.w = this.body.quaternion.w;
    }

    getPosition():{x:number,y:number,z:number}{
        return {x:this.body.position.x,y:this.body.position.y,z:this.body.position.z}
    }

    updatePositionAndRotation(){
        this.objectState.position.x = MWorld.smallFloat(this.body.position.x);
        this.objectState.position.y = MWorld.smallFloat(this.body.position.y);
        this.objectState.position.z = MWorld.smallFloat(this.body.position.z);

        this.objectState.quaternion.x = MWorld.smallFloat(this.body.quaternion.x);
        this.objectState.quaternion.y = MWorld.smallFloat(this.body.quaternion.y);
        this.objectState.quaternion.z = MWorld.smallFloat(this.body.quaternion.z);
        this.objectState.quaternion.w = MWorld.smallFloat(this.body.quaternion.w);
    }

    

}