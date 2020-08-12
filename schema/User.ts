import { Client} from "colyseus";
import { GameRoom } from "../rooms/GameRoom";
import { SObject } from "../world/SObject";
import CANNON, { World } from 'cannon';
import { GameState, UserState } from "./GameRoomState";
import { MWorld } from "../world/world";
import { SphereModel } from "../db/DataBaseSchemas";

export class SUser {
    client: Client;
    room: GameRoom;
    name: String;
    golfball: SObject;
    userState:UserState;
    startShots = 1;
    public static golfMass:number = 1;
    constructor(client: Client, room: GameRoom,userState:UserState) {
        this.client = client;
        this.room = room;
        this.userState = userState;

        this.golfball = room.world.createSphere(new SphereModel({radius:MWorld.golfBallSize,material:"ballMaterial"}), client);
        this.golfball.objectState.type = "golfball";
        this.golfball.changeMass(SUser.golfMass);
        
    

    }
}