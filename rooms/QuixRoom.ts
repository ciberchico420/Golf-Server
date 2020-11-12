import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema } from '@colyseus/schema'

import { Worker } from 'worker_threads';
import { quixServer } from "..";
import { GameState } from "../schema/GameRoomState";
import { WorldInstance } from "../world2/WorldsManager";


export class QuixRoom extends Room {

    public State: GameState;
    //public sWorld: SWorld;
    maxClients = 1;
    worker: Worker;
    autoDispose = true;
    initMap:string = "puzzle"
    worldInstance: WorldInstance;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;

        quixServer.worldsManager.register(this);

    }
    tick() {
        //console.log("tick");
        //this.sWorld.tick(Date.now());
    }
    // When client successfully join the room
    onJoin(client: Client, options: any) {
        //this.createUser(client);
     // this.createUser(client);

    }
    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {
        this.worldInstance.removeRoom(this);
        console.log("client leave");
    }


    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {
        console.log("Quix room disposed");
        //this.worker.terminate();
    }
}