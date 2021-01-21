import { QuixServer } from "..";
import { Worker } from 'worker_threads';
import { c } from "../c";
import { IBox, IObject, ISphere, MapModel } from "../db/DataBaseSchemas";
import { BoxObject, GameState, ObjectMessage, ObjectState, SphereObject } from "../schema/GameRoomState";
import { QuixRoom, RoomUser } from "../rooms/QuixRoom";
import { Room } from "colyseus";
import { WIBox } from "../db/WorldInterfaces";
import { Schema } from '@colyseus/schema'
import { values } from "lodash";

export class WorldsManager {
    quixServer: QuixServer;
    worlds: Map<string, WorldInstance> = new Map<string, WorldInstance>();
    constructor(quixServer: QuixServer) {
        this.quixServer = quixServer;
        //this.createWorld();
    }
    createWorld(): WorldInstance {
        var ins = new WorldInstance(this, c.uniqueId());
        // ins.generateMap("puzzle");
        this.worlds.set(ins.uID, ins);
        return ins;
    }
    destroyWorld(w: WorldInstance) {
        w.sendMessage("kill", null);
        this.worlds.delete(w.uID);
    }
    register(room: QuixRoom) {
        var createWorld = false;
        var registred = false;
        this.worlds.forEach(world => {
            if (!registred) {
                if (world.rooms.size < world.maxRooms) {
                    if (world.map == room.initMap) {
                        this.addRoomToWorld(world, room);
                        registred = true;
                    }
                }
            }


        });

        if (createWorld || !registred) {
            var worldn = this.createWorld();
            this.addRoomToWorld(worldn, room);
        }
    }
    addRoomToWorld(world: WorldInstance, room: QuixRoom) {
        world.addRoom(room);
        room.worldInstance = world;
    }
    shutDown() {

        this.worlds.forEach(element => {
            this.destroyWorld(element);
        });
        console.log("Shutting down WorldManager")
    }
}

export class WorldInstance {
    manager: WorldsManager;
    worker: Worker;
    map: string;
    uID: string;
    maxRooms: number = 10;
    timeToDestroy: number = 1//60000;
    rooms: Map<string, QuixRoom> = new Map<string, QuixRoom>();
    objects: Map<string, ObjectState> = new Map<string, ObjectState>();
    seeAllObjects: boolean = false;
    constructor(manager: WorldsManager, uID: string) {
        this.uID = uID;
        this.manager = manager;
        this.createWorker();

        this.readMessages();
    }
    addRoom(room: QuixRoom) {
        console.log("Added new room " + room.roomId + " in " + this.uID);
        this.rooms.set(room.roomId, room);
        if (this.map == undefined) {
            this.map = room.initMap;
            this.generateMap(this.map);
            console.log("Generating map because map is undefined");
        }
        this.sendMessage("addRoom", { uID: room.roomId })

        this.sincronize();
    }
    removeRoom(room: QuixRoom) {
        this.rooms.delete(room.roomId);
        if (this.rooms.size == 0) {
            setTimeout(() => {
                if (this.rooms.size == 0) {
                    this.manager.destroyWorld(this);
                    console.log("Destroying world " + this.uID + " due inactivity");
                }
            }, this.timeToDestroy);
        }
        this.sendMessage("removeRoom", room.roomId);
        //this.sendMessage("kill",null);
    }
    sincronize() {
        this.sendMessage("sincronize", null);
    }
    private createWorker() {
        this.worker = new Worker('./world/TSWorker/jsworker.js', {
            workerData: {
                path: '../../world2/world2.ts',
            }
        });

        this.sendMessage("maxRooms", this.maxRooms);
    }
    resolve(path: string, obj: any) {
        return path.split('.').reduce(function (prev, curr) {
            return prev ? prev[curr] : null
        }, obj || self)
    }
    private readMessages() {
        this.worker.on("message", (value: { type: string, m: any }) => {
            if (value.type == "time") {
                this.rooms.forEach((room) => {
                    room.broadcast("time", value.m as number);
                });
            }
            if (value.type == "objectMessage") {
                var obj: ObjectMessage = value.m;
                var room = this.rooms.get(value.m.room);
                if (room != undefined) {
                    this.rooms.get(value.m.room).broadcast("objectM", obj);
                }

            }
            if (value.type == "messageToOwner") {
                this.rooms.get(value.m.room).gameControl.users.forEach(user => {
                    if (user.player.uID == value.m.uID) {
                        user.client.send("info", value.m.message);
                    }
                });
            }
            if (value.type == "setState") {
                var mess: { path: string, property: string, value: any, room: string } = value.m;
                var room = this.rooms.get(mess.room);
                if (room) {
                    var stateObj = this.resolve(mess.path, room.State);
                    if(stateObj){
                        stateObj[mess.property] = mess.value;
                    }else{
                        console.error("Cant find "+mess.path);
                    }
                    
                }

            }

            if (value.type == "updateObjects") {

                var bodies: { ob: ObjectState, room: string }[] = value.m;
                bodies.forEach(obj => {

                    this.rooms.forEach(room => {
                        if (room.roomId == obj.room || obj.room == "map" || this.seeAllObjects) {
                            var roomobj: ObjectState = room.State.world.objects[obj.ob.uID];
                            if (roomobj == undefined) {
                                roomobj = this.createObjectInRoom(obj.ob as BoxObject, room);
                            }
                            this.updatePositionAndRotation(room, obj.ob);
                        }
                    });

                });
            }
            if (value.type == "updateObject") {
                var body: { ob: ObjectState, room: string }
                this.rooms.get(body.room)
            }

            if (value.type == "deleteObject") {
               
                this.rooms.forEach((room) => {
                    delete room.State.world.objects[value.m];
                });
            }
            if (value.type == "destroy") {
                this.rooms.forEach((room) => {
                    delete room.State.world.objects[value.m];
                });
            }

        })
    }
    private updatePositionAndRotation(room: QuixRoom, obj: ObjectState) {
        room.State.world.objects[obj.uID].position.x = obj.position.x;
        room.State.world.objects[obj.uID].position.y = obj.position.y;
        room.State.world.objects[obj.uID].position.z = obj.position.z;

        room.State.world.objects[obj.uID].quaternion.x = obj.quaternion.x;
        room.State.world.objects[obj.uID].quaternion.y = obj.quaternion.y;
        room.State.world.objects[obj.uID].quaternion.z = obj.quaternion.z;
        room.State.world.objects[obj.uID].quaternion.w = obj.quaternion.w;
    }
    sendMessage(type: string, m: any) {
        this.worker.postMessage({ type: type, m: m });
    }
    sendMessageFromRoom(type:string,m:any,room:string,client:string){
        this.sendMessage(type,{room:room,user:client,m:m});
    }
    setValue(uID: string, value: string, v: any) {
        this.sendMessage("set", { value: value, v: v, uID: uID });

    }
    generateMap(mapName: string) {
        this.map = mapName;
        MapModel.find({ name: mapName }, (err, doc) => {
            if (doc.length > 0) {
                var map = doc[0];
                this.sendMessage("generateMap", map.toJSON())
            }
        });
    }

    private createObjectInRoom(obj: ObjectState, room: QuixRoom): BoxObject {
        room.State.world.objects[obj.uID] = c.serializeObjectState(obj);

        return room.State.world.objects[obj.uID];
    }

    createBox(box: IBox, roomUser: RoomUser, room: QuixRoom) {
        var user = roomUser == undefined ? undefined : roomUser.client.sessionId;
        this.sendMessage("createBox", { user: user, o: box.toJSON(), room: room.roomId });
    }
    createSphere(sphere: ISphere, roomUser: RoomUser, room: QuixRoom) {
        var user = roomUser == undefined ? undefined : roomUser.client.sessionId;
        this.sendMessage("createSphere", { user: user, o: sphere.toJSON(), room: room.roomId });
    }

    destroyObject(obj: IObject) {
        this.sendMessage("destroy", obj.uID);
    }
}