import { Client } from "colyseus";
import { GameRoom } from "../../rooms/GameRoom";
import { ObjectState } from "../../schema/GameRoomState";
import { SObject } from "../SObject"
import { MWorld } from "../world";

export class CheckPoint extends SObject{
    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, room:GameRoom) {
        super(bodyState,body,client,room);
        body.collisionResponse = false;
    }
}