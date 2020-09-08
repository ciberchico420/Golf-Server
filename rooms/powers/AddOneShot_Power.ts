import { Power } from "./Power";
import { GameRoom } from "../GameRoom";
import { PowerState, TurnPlayerState } from "../../schema/GameRoomState";

export class AddOneShot_Power extends Power  {
    price = 3;
    name = "Add one shot"
    

    onActivate(){
        super.onActivate();
        var playerStt:TurnPlayerState = this.room.State.turnState.players[this.owner.userState.sessionId];
        playerStt.shots+=1;
    }
}