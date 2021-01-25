import { has, hasIn } from "lodash";
import { c } from "../../c";
import { ObjectState, SphereObject, V3 } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { WorldRunner } from "../WorldRunner";
import { Player2 } from "./Player2";

export class GolfBall2 extends WObject {
    spawnPoint: V3;
    onFallArea: boolean = false;
    radius:number;
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        this.spawnPoint = c.createV3(world.spawnPoint.x, world.spawnPoint.y, world.spawnPoint.z);
        this.body.angularDamping = .7;
        this.radius = (this.objectState as SphereObject).radius;
        this.body.addEventListener("collide", (e: any) => {
            this.onCollide(e);
        });
    }
    updateStateInRoom(){
        this.world.sendMessageToParent("updateObject",JSON.stringify(this.objectState));
    }
    onCollide(e: any) {
        var colObj: WObject = this.world.getWObjectByBodyID(e.body.id);
      
        if (colObj != undefined) {
            var force = Math.abs(e.contact.getImpactVelocityAlongNormal());
            var div = 30;
            switch (colObj.objectState.type) {
                case "box":
                   /* this.objectState.sound.status = "play";
                    // var force = (Math.abs(this.body.angularVelocity.x) + Math.abs(this.body.angularVelocity.z)) / 100;
                    //console.log(force);

                    this.objectState.sound.volume = force / div;
                    this.objectState.sound.uID = colObj.uID;*/
                    break;
                case "floor":

                   /* if (force > 10) {

                        this.objectState.sound.status = "play";
                        //console.log(force);
                        this.objectState.sound.volume = force / div;
                        this.objectState.sound.uID = colObj.uID;
                    }*/

                    break;
                case "checkpoint":
                    console.log("Collided with checkpoint");
                    break;
                case "fallArea":
                    if (!this.onFallArea) {
                        var worker: WorldRunner = new WorldRunner(this.world);
                        console.log("In fall area")
                        worker.setTimeout(() => {
                            this.setPositionToSpawnPoint();
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
    tick() {
        if (this.hasInit) {
            if (this.body.position.y < -50.5) {
                this.setPositionToSpawnPoint();
            }
        }
    }
    setPositionToSpawnPoint() {
        this.stop();
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
        this.needUpdate = true;
    }
    firstTick() {
        this.setPositionToSpawnPoint();
        //var players: Player2[] = this.world.findObjectsByType("Player2", this.roomID) as Player2[];
        var player = this.world.findObjectByTypeAndOwner("Player2",this.roomID,this.objectState.owner.sessionId) as Player2;
        if(player != undefined){
           player.golfBall = this;
        new WorldRunner(this.world).setInterval(() => { this.tick() }, 1); 
        }else{
            console.log("Player not found at golfball2");
        }
        

       /*players.forEach(element => {
            if (element.objectState.owner.sessionId == this.objectState.owner.sessionId) {
                element.golfBall = this;
            }
        });*/

       

    }
}