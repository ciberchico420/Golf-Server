import { Room } from "colyseus";
import { GameState } from "../schema/GameRoomState";
import PhysicsController from "./Physics/PhysicsController";

export class QuixPhysicsRoom extends Room{
    State: GameState;
    maxClients = 1;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        new PhysicsController(this);

    }
}