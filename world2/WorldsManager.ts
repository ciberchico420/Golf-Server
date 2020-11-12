import { QuixServer } from "..";
import { Worker } from 'worker_threads';
import { c } from "../c";
import { MapModel } from "../db/DataBaseSchemas";
import { BoxObject, GameState, ObjectState } from "../schema/GameRoomState";
import { QuixRoom } from "../rooms/QuixRoom";
import { Room } from "colyseus";

export class WorldsManager {
    quixServer: QuixServer;
    worlds: Map<string, WorldInstance> = new Map<string, WorldInstance>();
    constructor(quixServer: QuixServer) {
        this.quixServer = quixServer;
        this.createWorld();
    }
    createWorld() {
        var ins = new WorldInstance(this, c.uniqueId());
        ins.generateMap("puzzle");
        this.worlds.set(ins.uID, ins);
    }
    register(room: QuixRoom) {
        this.worlds.forEach(world => {
            if (world.map == room.initMap || world.map == undefined) {
                world.addRoom(room);
                room.worldInstance = world;
                return;
            }
        });
    }
}

export class WorldInstance {
    manager: WorldsManager;
    worker: Worker;
    map: string;
    uID: string;
    maxRooms: number = 5;
    rooms: Map<string, QuixRoom> = new Map<string, QuixRoom>();
    objects: Map<string, ObjectState> = new Map<string, ObjectState>();
    constructor(manager: WorldsManager, uID: string) {
        this.uID = uID;
        this.manager = manager;
        this.createWorker();

        this.readMessages();
    }
    addRoom(room: QuixRoom) {
        console.log("Added new room "+room.roomId);
        this.rooms.set(room.roomId, room);
        if(this.map == undefined){
            this.map = room.initMap;
            this.generateMap(this.map);
        }

        this.sincronize();
    }
    removeRoom(room:QuixRoom){
        this.rooms.delete(room.roomId);
    }
    sincronize(){
        this.sendMessage("sincronize",null);
    }
    createWorker() {
        this.worker = new Worker('./world/TSWorker/jsworker.js', {
            workerData: {
                path: '../../world2/world2.ts',
            }
        });
    }
    createBoxInRooms(obj:BoxObject){
        this.rooms.forEach(element => {
            this.createBoxInRoom(obj,element);
        });
        this.objects.set(obj.uID, obj);
        
    }
    createBoxInRoom(obj:BoxObject,room:QuixRoom):BoxObject{
        room.State.world.objects[obj.uID] = c.serializeBoxObject(obj);

        return room.State.world.objects[obj.uID];
    }
    readMessages() {
        this.worker.on("message", (value: { type: string, m: any }) => {
            if (value.type == "time") {
                this.rooms.forEach((room)=>{
                    room.broadcast("time", value.m as number);
                });
                // this.broadcast("time", value.m as number);
            }

           /* if (value.type == "createBox") {
                var obj: BoxObject = value.m;
                this.createBoxInRooms(obj);
            }*/

            if (value.type == "updateBodies") {

                var bodies: ObjectState[] = value.m;
                bodies.forEach(obj => {
                
                    this.rooms.forEach(room => {
                        var roomobj:ObjectState = room.State.world.objects[obj.uID];
                        if(roomobj == undefined){
                            roomobj = this.createBoxInRoom(obj as BoxObject,room);//this.createBoxInRoom(obj as BoxObject,room);
                        }
                        this.updatePositionAndRotation(room,obj);
  
                    });
               
                });
            }

        })
    }
    updatePositionAndRotation(room:QuixRoom,obj:ObjectState){
        room.State.world.objects[obj.uID].position.x = obj.position.x;
        room.State.world.objects[obj.uID].position.y =obj.position.y;
        room.State.world.objects[obj.uID].position.z = obj.position.z;

        room.State.world.objects[obj.uID].quaternion.x = obj.quaternion.x;
        room.State.world.objects[obj.uID].quaternion.y = obj.quaternion.y;
        room.State.world.objects[obj.uID].quaternion.z = obj.quaternion.z;
        room.State.world.objects[obj.uID].quaternion.w = obj.quaternion.w;
    }
    sendMessage(type: string, m: any) {
        this.worker.postMessage({ type: type, m: m });
    }
    setValue(uID:string,value:string,v:any){
        this.sendMessage("set",{value:value,v:v,uID:uID});

    }
    generateMap(mapName: string) {
        this.map = mapName;
        MapModel.find({ name: mapName }, (err, doc) => {
            if (doc.length > 0) {
                var map = doc[0];
                this.sendMessage("generateMap", map.toJSON())
                //console.log(map);
            }
        });
    }
}