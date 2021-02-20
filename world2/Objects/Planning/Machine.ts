
import { GolfBall2, Player2, WObject } from "..";
import { Agent, AgentState } from "../../../AI/Agent";
import { BoardObject } from "./BoardObject";

export class Machine extends BoardObject {

    gems: number = 10;
    Agent: Agent;

    lastBall: GolfBall2;

    firstTick() {
        super.firstTick();
        this.Agent = new Agent(this);

        this.body.addEventListener("collide", this.onCollide.bind(this))
    }
    onCollide(e: any) {
        var obj: WObject = this.world.getWObjectByBodyID(e.body.id)
        if (obj instanceof GolfBall2) {
            
            if (this.lastBall != obj && this.user.sessionId != obj.userID) {
                if (obj instanceof GolfBall2) {
                    this.user.state.gems -= this.gems;
                    obj.player.user.state.gems += this.gems;
                }
            }

            this.lastBall = obj;
        }


    }
}
