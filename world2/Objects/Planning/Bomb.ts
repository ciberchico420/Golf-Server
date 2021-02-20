import { Vec3 } from "cannon";
import { GolfBall2, WObject } from "..";
import { c } from "../../../c";
import { Player2 } from "../Player2";
import { BoardObject } from "./BoardObject";

export class Bomb extends BoardObject{
    bombPower: number = 700;
    firstTick(){
        super.firstTick();
        console.log("Bomb");

        this.body.addEventListener("collide",this.onCollide.bind(this))
    }
    onCollide(e:any) {
        var obj: WObject = this.world.getWObjectByBodyID(e.body.id)
        if (obj instanceof GolfBall2 || obj instanceof Player2) {
            console.log("collide",e.contact)
            let power = new Vec3(-(this.body.velocity.x*this.bombPower*10),this.bombPower ,-(this.body.velocity.z*this.bombPower*10) );
            obj.body.applyImpulse(power,obj.body.position);

            this.world.nextStep(()=>{
                this.room.world.destroyObject(this.objectState.uID);
            })

           
        }
        
    }
}