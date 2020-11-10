import { Client } from "colyseus";
import { GameRoom } from "../../rooms/GameRoom";
import { ObjectState } from "../../schema/GameRoomState";
import { SObject } from "../SObject"
import { MWorld } from "../world";

export class Hole extends SObject{
    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, room:GameRoom) {
        super(bodyState,body,client,room);
        this.body.addEventListener("collide", (e: any) => {
            this.onCollide(e);
        });
    }

    onCollide(e: any){
       
        var object: SObject = undefined;
        this.room.world.sobjects.forEach(element => {
            if (e.body.id == element.body.id) {
                object = element;
            }


        });
        if (object != undefined) {
            if (object.objectState.type == "golfball") {
                this.room.setWinner(object.objectState)
            }
        }
    }
}