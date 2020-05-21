import { Client} from "colyseus";
import { GameRoom } from "../rooms/GameRoom";
import { SObject } from "../world/SObject";
import CANNON, { World } from 'cannon';
import { GameState, UserState } from "./GameRoomState";
import { MWorld } from "../world/world";

export class SUser {
    client: Client;
    room: GameRoom;
    name: String;
    golfball: SObject;
    userState:UserState;
    constructor(client: Client, room: GameRoom,userState:UserState) {
        this.client = client;
        this.room = room;
        this.userState = userState;

        this.golfball = room.world.createSphere(MWorld.golfBallSize, client);
        this.golfball.objectState.type = "golfball";
        this.golfball.changeMass(5);
        console.log(room.world.ballSpawn);
        this.golfball.setPosition(room.world.ballSpawn.x, room.world.ballSpawn.x, room.world.ballSpawn.x)

    }

    setWin(){
        (<GameState>this.room.state).winner = (<GameState>this.room.state).users[this.client.sessionId];
    }
}