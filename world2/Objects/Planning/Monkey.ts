
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld } from "../../world2";
import { WorldRunner } from "../../WorldRunner";
import { Player2 } from "./../Player2";

export class Monkey extends WObject {
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);

    }
}