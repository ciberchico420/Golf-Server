import { World } from "cannon";
import { Client } from "colyseus";
import { GameRoom } from "../../rooms/GameRoom";
import { ObjectState } from "../../schema/GameRoomState";
import { SObject } from "../SObject";
import { MWorld } from "../world";

export class GolfBall extends SObject {
    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, world: MWorld) {
        super(bodyState, body, client, world);
        console.log("GolfBall created");
        this.body.addEventListener("collide", (e: any) => {
            this.onCollide(e);
        });
        this.body.addEventListener("beginContact", (e: any) => {
            this.onBeginContact(e);
        })
    }
    onBeginContact(e: any) {
        console.log("Begin contact", e);
    }

    onCollide(e: any) {


        var colObj: SObject;
        if (this.world.sobjects.size > 0) {
            this.world.sobjects.forEach(element => {
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
                        this.world.room.state.turnState.players[this.objectState.owner.sessionId].checkpoint.x = colObj.objectState.position.x;
                        this.world.room.state.turnState.players[this.objectState.owner.sessionId].checkpoint.y = colObj.objectState.position.y;
                        this.world.room.state.turnState.players[this.objectState.owner.sessionId].checkpoint.z = colObj.objectState.position.z;
                        break;
                    case "fallArea":
                        this.world.room.gameControl.resetBallSpawn(this.world.room.users.get(this.objectState.owner.sessionId));
                        break;
                    default:
                        break;
                }


            }

        }

        // console.log(this.sobjects);



    }
}