import { has, hasIn } from "lodash";
import { c } from "../../c";
import { ObjectState, SphereObject, V3 } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { WorldRunner } from "../WorldRunner";
import { Player2 } from "./Player2";
import { WIObject, WISphere } from "../../db/WorldInterfaces";

export class GolfBall2 extends WObject {

    spawnPoint: V3;
    onFallArea: boolean = false;
    radius: number;
    afterFallListeners: Array<() => any> = Array();
    player: Player2;

    maxDistance: number = 100;
    damageForDistance = .02;
    sendEnergyBool: boolean = false;
    constructor(bodyState: WIObject, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);

        this.body.angularDamping = .7;
        this.radius = (this.objectState as WISphere).radius;
        this.body.addEventListener("collide", (e: any) => {
            this.onCollide(e);
        });
    }
    updateStateInRoom() {
        this.world.sendMessageToParent("updateObject", JSON.stringify(this.objectState));
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
                            c.triggerEvents(this.afterFallListeners)
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
        this.checkIfFalling();
        this.tickRadiusWithBall();
    }
    checkIfFalling() {
        if (this.hasInit) {
            if (this.body.position.y < -50.5) {
                this.setPositionToSpawnPoint();
                c.triggerEvents(this.afterFallListeners)
            }
        }
    }
    private tickRadiusWithBall() {

        var distance = this.player.distanceWithBall();
        if (distance > this.maxDistance) {
            this.player.receiveDamage(this.damageForDistance);
            this.sendEnergyBool = true;
        } else {
            if (this.player.user.state.energy < this.player.maxEnergy) {
                this.player.addEnergy(this.damageForDistance / 3);
                this.sendEnergyBool = true;
            }

        }
    }

    sendEnergy() {
        if (this.sendEnergyBool) {
            this.player.user.update();
        }

    }

    setPositionToSpawnPoint() {
        if(this.spawnPoint != undefined){
             this.stop();
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
        this.needUpdate = true;
        }else{
            console.log("Spawn point not found at GolfBall2.ts")
        }
       
    }
    findPlayer(){
        this.player = this.world.findObjectByTypeAndOwner("Player2", this.roomID, this.objectState.owner.sessionId) as Player2;
        if (this.player != undefined) {

            this.player.setGolfBall(this);
            new WorldRunner(this.world).setInterval(this.tick.bind(this), 1);
            this.spawnPoint = this.player.spawnPoint;
        } else {
            console.log("Player not found at golfball2");
        }
    
    }
    firstTick() {
        
       this.findPlayer();
       this.setPositionToSpawnPoint();



    }
}