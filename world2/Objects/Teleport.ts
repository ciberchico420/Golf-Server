
import { ObjectState } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { WorldRunner } from "../WorldRunner";
import { Player2 } from "./Player2";

export class Teleport extends WObject {
    jumpForceSaved:number;
    movePowerSaved: number;
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        body.collisionResponse = false;
        if (!this.objectState.uID.includes("1")) {
            this.body.addEventListener("collide", (o: any) => {
                var obj: WObject = this.world.getWObjectByBodyID(o.body.id)
                if (obj instanceof Player2) {
                    var teleport2: WObject = world.wobjects.get(bodyState.uID + "1");
                    obj.golfBall.setPosition(teleport2.body.position.x, teleport2.body.position.y, teleport2.body.position.z)
                    obj.setPosition(teleport2.body.position.x, teleport2.body.position.y, teleport2.body.position.z)

                }
            })
        }else{
            this.body.addEventListener("collide", (o: any) => {
                var obj: WObject = this.world.getWObjectByBodyID(o.body.id)
                if (obj instanceof Player2) {
                  //
                  this.jumpForceSaved = obj.jumpForce;
                  this.movePowerSaved = obj.movePower;
                  obj.jumpForce =300;
                  obj.movePower = 80;
                  obj.afterJumpListeners.push(()=>{
                      console.log("hola from teleport");
                      (obj as Player2).jumpForce = this.jumpForceSaved;
                      (obj as Player2).movePower = this.movePowerSaved;
                  })

                }
            })
        }


    }
}