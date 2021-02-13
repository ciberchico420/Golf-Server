
import { ObjectState } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { WorldRunner } from "../WorldRunner";
import { Player2 } from "./Player2";
import { WIObject } from "../../db/WorldInterfaces";
import { Vec3 } from "cannon";

export class testSphere extends WObject {
    constructor(bodyState: WIObject, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        console.log("Test sphere");
        this.body.angularDamping = 0.3;
    }
    firstTick(){
        this.body.applyImpulse(new Vec3(10,0,0),this.body.position);
    }
}