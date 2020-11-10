import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema } from '@colyseus/schema'
import { GameState, UserState, PowerState, Message, TurnPlayerState, V3, ObjectState, BoxObject, WorldState, Quat } from "../schema/GameRoomState";
import { MWorld } from "../world/world";
import { SUser } from "../world/SUser";
import _, { isNil, toInteger } from 'lodash';
import CANNON, { Vec3, Quaternion } from 'cannon';
import { BoxModel, IBox, SphereModel } from "../db/DataBaseSchemas";
import { AddOneShot_Power } from "./powers/AddOneShot_Power";
import { CreateBox_Power } from "./powers/CreateBox_Power";
import { FlashEnemies_Power } from "./powers/FlashEnemies_Power";
import { Power } from "./powers/Power";
import { c } from "../c";
import { Obstacle } from "../world/Obstacles";
import { SWorker } from "./Worker";
import { GameRoom } from "./GameRoom";
import { SWorld } from "../world2/world2";
import { Player2 } from "../world2/Player2";
import { Worker } from 'worker_threads';
import { rooms } from "..";


export class QuixRoom extends Room {
    public State: GameState;
    //public sWorld: SWorld;
    public WorkersListening: Array<SWorker> = new Array<SWorker>(0);
    maxClients = 1;
    worker: Worker;
    autoDispose = true;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        // this.sWorld = new SWorld(this);

        //setInterval(() => this.tick(), 10);


        this.worker = new Worker('./world/TSWorker/jsworker.js', {
            workerData: {
                path: '../../world2/world2.ts',
                //toRun:this.tickTest
            }
        });

        this.worker.on("message", (value: { type: string, m: any }) => {
            if (value.type == "time") {
                this.broadcast("time", value.m as number);
            }

            if (value.type == "createBox") {
                var obj: BoxObject = c.serializeBoxObject(value.m);
                this.State.world.objects[obj.uID] = obj;
            }

            if (value.type == "updateBodies") {
                var bodies:ObjectState[] = value.m;
                bodies.forEach(obj => {
               // var obj: BoxObject = c.serializeBoxObject(body as BoxObject);
                this.State.world.objects[obj.uID].position.x = obj.position.x;
                this.State.world.objects[obj.uID].position.y = obj.position.y;
                this.State.world.objects[obj.uID].position.z = obj.position.z;

                this.State.world.objects[obj.uID].quaternion.x = obj.quaternion.x;
                this.State.world.objects[obj.uID].quaternion.y = obj.quaternion.y;
                this.State.world.objects[obj.uID].quaternion.z = obj.quaternion.z;
                this.State.world.objects[obj.uID].quaternion.w = obj.quaternion.w;
                });
            }

        })

        this.onMessage("close", (client, message) => {
            client.leave();
        })




        this.onMessage("moveR", (client, message) => {
            /*var player = this.users.get(client.sessionId).player;
            if (player != undefined) {
                player.move(c.getRandomNumber(-1, 1), c.getRandomNumber(-1, 1), 0, 0);
            }*/
        });

        // sWorld.
    }
    tick() {
        //console.log("tick");
        //this.sWorld.tick(Date.now());
        this.WorkersListening.forEach(wrk => {
            wrk.tick();
        })
    }


    // When client successfully join the room
    onJoin(client: Client, options: any) {
        //this.createUser(client);
     // this.createUser(client);

    }
    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {
        console.log("client leave");
    }


    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {
        console.log("Quix room disposed");
        this.worker.terminate();
    }
}