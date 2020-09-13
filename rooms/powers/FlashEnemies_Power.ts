import { GameRoom } from "../GameRoom";
import { PowerState } from "../../schema/GameRoomState";
import { Power } from "./Power";

export class FlashEnemies_Power extends Power  {
    price = 10;
    type = "FlashEnemies"
    activate(){
        super.activate();
    }
}