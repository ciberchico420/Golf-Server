import { Client } from "colyseus";
import { ObjectState } from "../../schema/GameRoomState";
import { SObject } from "../SObject"
import { MWorld } from "../world";

export class CheckPoint extends SObject{
    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, world: MWorld) {
        super(bodyState,body,client,world);
        body.collisionResponse = false;
    }
}