import { WIObject } from "../../../db/WorldInterfaces";
import { WObject } from "../WObject";
import { BoardObject } from "./BoardObject";

export class Board extends WObject {
    over: Map<string, WObject> = new Map();
    firstTick() {
        this.changeCollitionResponse(false);

    }
}
