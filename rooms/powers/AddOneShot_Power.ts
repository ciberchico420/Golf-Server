
import { GameRoom } from "../GameRoom";
import { PowerState, TurnPlayerState } from "../../schema/GameRoomState";
import { Power } from "./Power";

export class AddOneShot_Power extends Power  {
    price = 3;
    name = "Add one shot"
    type = "AddOneShot"
    

    activate(){
        super.activate();
        var playerStt:TurnPlayerState = this.room.State.turnState.players[this.owner.userState.sessionId];
        //console.log(playerStt);
        playerStt.initialShots+=1;
        playerStt.shots+=1;
        this.destroy();

    }
}