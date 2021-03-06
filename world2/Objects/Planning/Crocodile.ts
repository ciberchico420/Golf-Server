import { ObjectMessage } from "../../../schema/GameRoomState";
import { AIBoardObject } from "./AIBoardObject";

export class Crocodile extends AIBoardObject {
    firstTick() {
        super.firstTick()

        console.log("Crocodile")


        this.addTimeOut("Say eat", () => {

            let om = new ObjectMessage().assign({ uID: this.objectState.uID, room: this.roomID, message: "text_Eat" });
            this.sendMessage(om);
        }, 1000)
    }
}