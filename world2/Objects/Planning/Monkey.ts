
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld } from "../../world2";
import { WorldRunner } from "../../WorldRunner";
import { Player2 } from "./../Player2";
import { WISphere } from "../../../db/WorldInterfaces";
import { BoardObject } from "./BoardObject";

export class Monkey extends BoardObject {
    constructor(bodyState: WISphere, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
    }

    firstTick() {
        super.firstTick();
        new WorldRunner(this.world).setTimeout(() => {
            this.room.setState("turnState","phase",1);
        }, 150);
    }
}