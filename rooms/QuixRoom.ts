import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema } from '@colyseus/schema'

import { Worker } from 'worker_threads';
import { quixServer } from "..";
import { BoxObject, EulerQuat, GameState, ShotMessage, UserState } from "../schema/GameRoomState";
import { WorldInstance } from "../world2/WorldsManager";
import { map } from "lodash";
import { WIBox } from "../db/WorldInterfaces";
import { BoxModel, IBox, ISphere, SphereModel } from "../db/DataBaseSchemas";
import { c } from "../c";
import { Box, Vec3 } from "cannon";


export class QuixRoom extends Room {

    public State: GameState;
    //public sWorld: SWorld;
    maxClients = 2;
    worker: Worker;
    autoDispose = true;
    initMap: string = "1000objs"
    worldInstance: WorldInstance;
    gameControl: GameControl;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;

        quixServer.worldsManager.register(this);
        this.gameControl = new GameControl(this);
        // this.gameControl.createBoxes(30, 10);

        this.readMessages();
    }
    readMessages() {
        this.gameControl.readMessages();
    }

    // When client successfully join the room
    onJoin(client: Client, options: any) {
        this.gameControl.onJoin(client);
    }
    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {

        console.log("Client " + client.sessionId + " leave");
        this.gameControl.users.get(client.sessionId).leave();
    }
    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {
        this.worldInstance.removeRoom(this);
        console.log("Quix room disposed");
    }
}

class GameControl {

    State: GameState;
    users: Map<string, RoomUser> = new Map<string, RoomUser>();
    room: QuixRoom;
    constructor(room: QuixRoom) {
        this.State = room.State;
        this.room = room;
    }
    onJoin(client: Client) {
        setTimeout(()=>{
            var us = new RoomUser(this, client);
            this.users.set(client.sessionId, us);
        },3000)
    }
    readMessages() {
        this.room.onMessage("move", (client, message) => {
            var player = this.users.get(client.sessionId);
            player.move(message.x, message.y, message.rotX, message.rotZ);
        })
        this.room.onMessage<ShotMessage>("shoot", (client, message) => {
            var player = this.users.get(client.sessionId);
            message.client = client.sessionId;
            message.room = this.room.roomId;
            // player.shoot(message.x, message.y, message.rotX, message.rotZ);
            this.room.worldInstance.sendMessage("shoot", message);

        })
        this.room.onMessage("rotate", (client, message: EulerQuat) => {
            var player = this.users.get(client.sessionId).player;
            if (player != undefined) {
                var playerID = this.users.get(client.sessionId).player.uID;
                this.room.worldInstance.setValue(playerID, "rotationQ", message.quat);
                this.room.worldInstance.sendMessage("rotateHitBox", { user: client.sessionId, rot: message, room: this.room.roomId });


                //this.users.get(client.sessionId).set("rotation",message)
            }

        });
        this.room.onMessage("jump", (client, message) => {
            var player = this.users.get(client.sessionId);
            player.jump(message);
        })
        this.room.onMessage("use_Power1", (client, message) => {
            this.room.worldInstance.sendMessageFromRoom("use_Power1",{},this.room.roomId,client.sessionId);
        })
    }
    boxes = 0;

    createBoxes(time: number, maxBoxes: number) {
        var box: IBox = new BoxModel();
        box.halfSize = c.createV3(5, 5, 5);
        box.instantiate = true;
        box.type = "boxBBB"
        box.quat = c.initializedQuat();
        box.mass = 1;
        box.position = c.createV3(0, 150, -100);

        var int = this.room.clock.setInterval(() => {
            if (this.boxes != maxBoxes) {
                box.uID = c.uniqueId();
                this.room.worldInstance.createBox(box, null, this.room);
                this.boxes++;
            } else {
                int.clear();
            }

        }, time);
    }
}

export class RoomUser {
    client: Client;
    gameControl: GameControl;
    player: IBox;
    golfBall: ISphere;
    constructor(gameControl: GameControl, client: Client) {
        this.client = client;
        this.gameControl = gameControl;

        this.createPlayer();
        this.createBall();
        var userState = new UserState();
        userState.sessionId = client.sessionId;
        this.gameControl.State.users[client.sessionId] = userState;
    }
    move(x: number, y: number, rotX: number, rotZ: number) {
        this.gameControl.room.worldInstance.sendMessage("move", { x: x, y: y, rotX: rotX, rotZ: rotZ, uID: this.player.uID });
    }
    jump(message: number) {
        this.gameControl.room.worldInstance.sendMessage("jump", { isJumping: message, uID: this.player.uID });
    }

    createPlayer() {
        var box: ISphere = new SphereModel();
        box.uID = c.uniqueId();
        //box.halfSize = c.createV3(.5, .5, .5);
        box.radius = 1;
        box.instantiate = true;
        box.type = "Player2"
        box.mesh = "Players/Sol/sol_prefab";
        box.quat = c.initializedQuat();
        box.mass = .2;
        box.material = "ballMaterial"
        box.position = c.createV3(0, 0, 0);
        this.gameControl.room.worldInstance.createSphere(box, this, this.gameControl.room)
        this.player = box;
    }

    createBall() {
        var sphere: ISphere = new SphereModel();
        sphere.uID = c.uniqueId();
        sphere.radius = 1;
        sphere.mass = 1;
        sphere.type = "GolfBall2";
        sphere.material = "ballMaterial"
        sphere.instantiate = true;

        this.gameControl.room.worldInstance.createSphere(sphere, this, this.gameControl.room);

        this.golfBall = sphere;
    }

    leave() {
        this.gameControl.room.worldInstance.destroyObject(this.player);
    }
}