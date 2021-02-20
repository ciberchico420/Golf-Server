
import { ObjectState } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { Player2 } from "./Player2";
import { GolfBall2 } from "./GolfBall2";
import { WIObject } from "../../db/WorldInterfaces";

export class Teleport extends WObject {
    shootPowerSaved:number;
    constructor(bodyState: WIObject, body: CANNON.Body, world: SWorld) {
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
                if (obj instanceof GolfBall2) {
                  //
                  this.shootPowerSaved = obj.player.shootForceMultiplier;
                  obj.player.shootForceMultiplier = 200;
                  obj.player.afterShootListeners.push(()=>{
                      (obj as GolfBall2).player.shootForceMultiplier = this.shootPowerSaved;
                  })

                }
            })
        }


    }
}