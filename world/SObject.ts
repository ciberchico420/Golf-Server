import {  ObjectState, Quat } from "../schema/GameRoomState";
import CANNON,{ Quaternion, Vec3, World } from "cannon";
import { Client } from "colyseus";
import { c } from "../c";
import { GameRoom } from "../rooms/GameRoom";
import { MWorld } from "./world";

export class SObject {
    body: CANNON.Body;
    objectState: ObjectState;
    client:Client;
    uID:string;
    lastPosition:Vec3;
    lastRotation:Quaternion;
    world:MWorld;
    sobjects = new Map<string, SObject>();
    room:GameRoom;
    constructor(bodyState: ObjectState, body: CANNON.Body,client:Client,world:MWorld) {
        this.body = body;
        this.objectState = bodyState;
        this.client = client;
        this.uID = c.uniqueId();
        this.world = world;
        this.room = world.room;
    }

    changeMass(newMass:number){
        this.body.mass = newMass;
        this.body.updateMassProperties();
    }
    changeType(type:number){
        this.body.type = type;
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

}