import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema } from '@colyseus/schema'

import { Worker } from 'worker_threads';
import { quixServer } from "..";
import { BoxObject, GameState } from "../schema/GameRoomState";
import { WorldInstance } from "../world2/WorldsManager";
import { map } from "lodash";
import { WIBox } from "../db/WorldInterfaces";
import { BoxModel, IBox } from "../db/DataBaseSchemas";
import { c } from "../c";


export class QuixRoom extends Room {

    public State: GameState;
    //public sWorld: SWorld;
    maxClients = 1;
    worker: Worker;
    autoDispose = true;
    initMap: string = "puzzle"
    worldInstance: WorldInstance;
    gameControl: GameControl;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;

        quixServer.worldsManager.register(this);
        this.gameControl = new GameControl(this);

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
        this.worldInstance.removeRoom(this);
        console.log("client leave");
    }
    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {
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
        var us = new RoomUser(this, client);
        this.users.set(client.sessionId, us);
    } 
    readMessages() {
        this.room.onMessage("move", (client, message) => {
            var player = this.users.get(client.sessionId);
            player.move(message.x, message.y, message.rotX, message.rotZ);
        })
    }
}

export class RoomUser {
    client: Client;
    gameControl: GameControl;
    player:IBox;
    constructor(gameControl: GameControl, client: Client) {
        this.client = client;
        this.gameControl = gameControl;

        this.createPlayer();
    }
    move(x: number, y: number, rotX: number, rotZ: number) {
       this.gameControl.room.worldInstance.sendMessage("move",{x:x,y:y,rotX:rotX,rotZ:rotZ,uID:this.player.uID});
    }

    createPlayer() {
        var box: IBox = new BoxModel();
        box.uID = c.uniqueId();
        box.halfSize = c.createV3(.5, .5, .5);
        box.instantiate = true;
        box.type = "player"
        box.mesh = "Players/Sol/sol_prefab"
        box.quat = c.initializedQuat();
        box.mass = 0;
        box.position = c.createV3(-150, 200, -180);
        this.gameControl.room.worldInstance.createBox(box, this)
        this.player = box;
    }
}