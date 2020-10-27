import { Client } from "colyseus";
import { GameRoom } from "../rooms/GameRoom";
import { SObject } from "./SObject";
import CANNON, { World } from 'cannon';
import { GameState, UserState, V3, Quat } from "../schema/GameRoomState";
import { MWorld } from "./world";
import { SphereModel, BoxModel, IBox } from "../db/DataBaseSchemas";
import { Power } from "../rooms/powers/Power";
import { c } from "../c";
import { GolfBall } from "./Objects/GolfBall";
import { Character } from "./Objects/Character";

export class SUser {
    client: Client;
    room: GameRoom;
    name: String;
    golfball: GolfBall;
    character:Character;
    userState: UserState;
    startShots = 1;
    public static golfMass: number = 1;

    public shop: Map<string,Power> = new Map<string,Power>();
    public bag: Map<string,Power> = new Map<string,Power>();

    constructor(client: Client, room: GameRoom, userState: UserState) {
        this.client = client;
        this.room = room;
        this.userState = userState;
    }

    createObjects(){
        this.createBall();
        this.createCharacter();
    }

    createBall(){
        this.golfball = this.room.world.createSphere(
            new SphereModel({ radius: MWorld.golfBallSize, material: "ballMaterial",instantiate:true,type:"golfball",owner:this.userState }), this.client) as GolfBall;
        this.golfball.changeMass(SUser.golfMass);
    }

    createCharacter(){
  
        var box:IBox = new BoxModel()
        box.halfSize = c.createV3(1,1,1);
        box.instantiate = true;
        box.type = "character";
        box.quat = c.initializedQuat();
        box.mass = 0;
        
        this.character = this.room.world.createBox(box,this.client) as Character;

       
    }
}