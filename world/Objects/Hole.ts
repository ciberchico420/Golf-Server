import { Client } from "colyseus";
import { ObjectState } from "../../schema/GameRoomState";
import { SObject } from "../SObject"
import { MWorld } from "../world";

export class Hole extends SObject{
    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, world: MWorld) {
        super(bodyState,body,client,world);
        this.body.addEventListener("collide", (e: any) => {
            this.onCollide(e);
        });
    }

    onCollide(e: any){
       
        var object: SObject = undefined;
        this.world.sobjects.forEach(element => {
            if (e.body.id == element.body.id) {
                object = element;
            }


        });
        if (object != undefined) {
            if (object.objectState.type == "golfball") {
                this.world.room.setWinner(object.objectState)
            }
        }
    }
}