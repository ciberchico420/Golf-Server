import { Client } from "colyseus";
import { GameRoom } from "../rooms/GameRoom";
import { SObject } from "./SObject";
import CANNON, { Quaternion, Vec3, World } from 'cannon';
import { GameState, UserState, V3, Quat, ShotMessage, ObjectMessage } from "../schema/GameRoomState";
import { MWorld } from "./world";
import { SphereModel, BoxModel, IBox } from "../db/DataBaseSchemas";
import { Power } from "../rooms/powers/Power";
import { c } from "../c";
import { GolfBall } from "./Objects/GolfBall";
import { Player as Player } from "./Objects/Player";
import { SWorker } from "../rooms/Worker";

export class SUser {
    client: Client;
    room: GameRoom;
    name: String;
    golfball: GolfBall;
    player: Player;
    userState: UserState;
    startShots = 1;
    public static golfMass: number = 1;

    public shop: Map<string, Power> = new Map<string, Power>();
    public bag: Map<string, Power> = new Map<string, Power>();

    constructor(client: Client, room: GameRoom, userState: UserState) {
        this.client = client;
        this.room = room;
        this.userState = userState;

    }

    createObjects() {

        this.createBall();
        new SWorker(this.room).setTimeout(() => { this.createCharacter() }, 10);
    }

    leave(){
        this.room.world.deleteObject(this.golfball);
        this.room.world.deleteObject(this.player);
    }

    createBall() {

        this.golfball = this.room.world.createSphere(
            new SphereModel({ radius: MWorld.golfBallSize, material: "ballMaterial", instantiate: true, type: "golfball" }), this.client) as GolfBall;
        this.golfball.changeMass(SUser.golfMass);

        if (this.room.world.ballSpawn != null) {
            this.golfball.setPosition(this.room.world.ballSpawn.x, this.room.world.ballSpawn.y, this.room.world.ballSpawn.z);
        }
    }

    createCharacter() {

        var box: IBox = new BoxModel()
        box.halfSize = c.createV3(.5, .5, .5);
        box.instantiate = true;
        box.type = "player";
        box.mesh = "Players/Sol/sol_prefab"
        box.quat = c.initializedQuat();
        box.mass = 0;

        console.log("Client for character", this.client.sessionId);
        this.player = this.room.world.createBox(box, this.client) as Player;



    }

    shootBall(message: ShotMessage) {

        // console.log(message);
        this.player.triggerShooting();
        this.room.getTurnPlayer(this.client.sessionId).shots -= 1;
        this.room.getTurnPlayer(this.client.sessionId).ballisMoving = true;

        new SWorker(this.room).setTimeout(() => {

            this.golfball.body.quaternion = new Quaternion(message.angle.x, message.angle.y, message.angle.z, message.angle.w);


            this.golfball.body.applyLocalImpulse(new CANNON.Vec3(
                0,
                0,
                (message.force * 35)
            ), new Vec3(0, 0, 0));

        }, AnimationTimes.shootBall)

    }
}


class AnimationTimes {
    static shootBall: number = 60;
    static stopBall: number = 25;
}