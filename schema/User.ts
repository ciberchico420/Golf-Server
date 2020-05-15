import { Client} from "colyseus";
import { MyRoom } from "../rooms/GameRoom";
import { MBody } from "../world/SObject";
import CANNON, { World } from 'cannon';
import { GameState, UserState } from "./GameRoomState";
import { MWorld } from "../world/world";

export class User {
    client: Client;
    room: MyRoom;
    name: String;
    ball: MBody;
    userState:UserState;
    constructor(client: Client, room: MyRoom,userState:UserState) {
        this.client = client;
        this.room = room;
        this.userState = userState;

        this.ball = room.world.createSphere(MWorld.golfBallSize, client);
        this.ball.objectState.type = "golfball";
        this.ball.changeMass(50);
        this.ball.setPosition(0, 6, -200)

    }

    setWin(){
        (<GameState>this.room.state).winner = (<GameState>this.room.state).users[this.client.sessionId];
    }
}