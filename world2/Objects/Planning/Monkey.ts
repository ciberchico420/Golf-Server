
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld } from "../../world2";
import { WorldRunner } from "../../WorldRunner";
import { Player2 } from "./../Player2";
import { WISphere } from "../../../db/WorldInterfaces";

export class Monkey extends WObject {
    constructor(bodyState: WISphere, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);

    }
}