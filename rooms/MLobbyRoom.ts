import { Room } from "colyseus";
import {LobbyState} from "../schema/MLobbyState";

export class MLobbyRoom extends Room{
onCreate(){
    
    this.setState(new LobbyState());

    console.log("Lobby room created");
}
}
