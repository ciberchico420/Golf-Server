import { Vec3 } from "cannon";
import { GolfBall2, WObject } from "..";
import { c } from "../../../c";
import { Player2 } from "../Player2";
import { BoardObject } from "./BoardObject";

export class Bomb extends BoardObject {
    bombPower: number = 300;
    hasExploted = false;
    firstTick() {
        super.firstTick();
        console.log("Bomb");

        this.body.addEventListener("collide", this.onCollide.bind(this))
    }
    onCollide(e: any) {
        if (!this.hasExploted) {
            var obj: WObject = this.world.getWObjectByBodyID(e.body.id)
            if (obj instanceof GolfBall2 || obj instanceof Player2) {
                let power = new Vec3(-(this.body.velocity.x * this.bombPower * 10), this.bombPower, -(this.body.velocity.z * this.bombPower * 10));
                obj.body.applyImpulse(power, obj.body.position);
                if (obj instanceof Player2) {

                    obj.dropGems(2);
                }
                this.hasExploted = true;
                this.world.nextStep(() => {
                    
                    this.room.world.destroyObject(this.objectState.uID);
                })


            }
        }


    }
}