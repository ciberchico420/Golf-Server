import { Client } from "colyseus";
import { GameRoom } from "../rooms/GameRoom";
import { SObject } from "./SObject";
import CANNON, { World } from 'cannon';
import { GameState, UserState, V3, Quat } from "../schema/GameRoomState";
import { MWorld } from "./world";
import { SphereModel, BoxModel } from "../db/DataBaseSchemas";
import { Power } from "../rooms/powers/Power";
import { c } from "../c";
import { GolfBall } from "./Objects/GolfBall";

export class SUser {
    client: Client;
    room: GameRoom;
    name: String;
    golfball: GolfBall;
    userState: UserState;
    startShots = 1;
    public static golfMass: number = 1;

    public shop: Map<string,Power> = new Map<string,Power>();
    public bag: Map<string,Power> = new Map<string,Power>();

    constructor(client: Client, room: GameRoom, userState: UserState) {
        this.client = client;
        this.room = room;
        this.userState = userState;


        this.golfball = room.world.createSphere(new SphereModel({ radius: MWorld.golfBallSize, material: "ballMaterial",instantiate:true,type:"golfball",owner:this.userState }), client) as GolfBall;
        this.golfball.changeMass(SUser.golfMass);
        //this.golfball.setPosition(this.room.world.ballSpawn.x,this.room.world.ballSpawn.y,this.room.world.ballSpawn.z);

  



    }
}