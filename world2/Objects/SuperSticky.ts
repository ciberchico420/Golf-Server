
import { ObjectState } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { WorldRunner } from "../WorldRunner";
import { Player2 } from "./Player2";
import { GolfBall2 } from "./GolfBall2";

export class SuperSticky extends WObject {
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);

        body.addEventListener("collide",(e:any) =>{
            var ob:WObject = world.getWObjectByBodyID(e.body.id)
            if(ob instanceof GolfBall2){
                ob.stop();
               // ob.player.setPositionToBall();

               new WorldRunner(world).setTimeout(()=>{
                   var play = (ob as GolfBall2).player;
                   play.setPositionToBall();
               },300)
            }
        });
    }
}