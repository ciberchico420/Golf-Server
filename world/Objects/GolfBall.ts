import { World } from "cannon";
import { Client } from "colyseus";
import { GameRoom } from "../../rooms/GameRoom";
import { SWorker } from "../../rooms/SWorker";
import { ObjectState } from "../../schema/GameRoomState";
import { SObject } from "../SObject";
import { MWorld } from "../world";

export class GolfBall extends SObject {
    onFallArea: boolean = false;

    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, room:GameRoom) {
        super(bodyState, body, client, room);
        console.log("GolfBall created");
        this.body.addEventListener("collide", (e: any) => {
            this.onCollide(e);
        });
    }
    onBeginContact(e: any) {
        console.log("Begin contact", e);
    }

    onCollide(e: any) {


        var colObj: SObject;
        if (this.room.world.sobjects.size > 0) {
            this.room.world.sobjects.forEach(element => {
                if (e.body.id == element.body.id) {
                    // console.log("Found", element.objectState.type);
                    colObj = element;
                }
            });
            if (colObj != undefined) {
                var force = Math.abs(e.contact.getImpactVelocityAlongNormal());
                var div = 30;
                switch (colObj.objectState.type) {
                    case "box":
                        this.objectState.sound.status = "play";
                        // var force = (Math.abs(this.body.angularVelocity.x) + Math.abs(this.body.angularVelocity.z)) / 100;
                        //console.log(force);

                        this.objectState.sound.volume = force / div;
                        this.objectState.sound.uID = colObj.uID;
                        break;
                    case "floor":

                        if (force > 10) {

                            this.objectState.sound.status = "play";
                            //console.log(force);
                            this.objectState.sound.volume = force / div;
                            this.objectState.sound.uID = colObj.uID;
                        }

                        break;
                    case "checkpoint":
                        console.log("Collided with checkpoint");
                        this.room.state.turnState.players[this.objectState.owner.sessionId].checkpoint.x = colObj.objectState.position.x;
                        this.room.state.turnState.players[this.objectState.owner.sessionId].checkpoint.y = colObj.objectState.position.y;
                        this.room.state.turnState.players[this.objectState.owner.sessionId].checkpoint.z = colObj.objectState.position.z;
                        break;
                    case "fallArea":
                        if (!this.onFallArea) {
                            var worker: SWorker = new SWorker(this.room);
                            console.log("In fall area")
                            worker.setTimeout(() => {
                                this.room.gameControl.resetBallSpawn(this.room.users.get(this.objectState.owner.sessionId));
                                this.onFallArea = false;
                            }, 150);
                        }
                            this.onFallArea = true;
                    
                        break;
                    default:
                        break;
                }


            }

        }

        // console.log(this.sobjects);



    }
}