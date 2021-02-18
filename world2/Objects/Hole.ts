import { GolfBall2 } from "./GolfBall2";
import { WObject } from "./WObject";

export class Hole extends WObject {

    firstTick() {
        this.body.addEventListener("collide", this.onCollide.bind(this))
    }
    onCollide(e: any) {
        let obj: GolfBall2 = this.world.getWObjectByBodyID(e.body.id) as GolfBall2;
        if (obj instanceof GolfBall2) {

            obj.player.room.setState("turnState", "winner", obj.objectState.owner.sessionId);
            obj.player.room.users.forEach(val=>{
                let startp =val.player.getStartPosition();
                val.player.setPosition(startp.x,startp.y,startp.z)
                val.player.golfBall.setPosition(startp.x,startp.y,startp.z)
            })

        }
    }
}