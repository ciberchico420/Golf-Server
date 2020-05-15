import {  ObjectState } from "../schema/GameRoomState";
import CANNON,{ Vec3 } from "cannon";
import { Client } from "colyseus";

export class MBody {
    body: CANNON.Body;
    objectState: ObjectState;
    client:Client;
    constructor(bodyState: ObjectState, body: CANNON.Body,client:Client) {
        this.body = body;
        this.objectState = bodyState;
        this.client = client;
    }

    changeMass(newMass:number){
        this.body.mass = 5;
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
}