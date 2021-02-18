import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, MapRoomState, Quat, ShotMessage } from '../schema/GameRoomState';

import { IBox, ISphere, IMap } from '../db/DataBaseSchemas';

import { WIBox, WIObject, WISphere, WIUserState } from '../db/WorldInterfaces';

import { WObject } from './Objects/WObject';
import { c } from '../c';
import { parentPort, workerData } from 'worker_threads';
import { DataBase } from '../db/DataBase';
import { Player2 } from './Objects/Player2';
import { WorldRunner } from './WorldRunner';
import * as WObjects from './Objects';
import { BoardObject } from './Objects/Planning/BoardObject';
import { WorldInstance } from './WorldsManager';
import { WorldRoom } from './WorldRoom';


export class SWorld {
    cworld: CANNON.World;
    wobjects = new Map<string, WObject>();

    public materials: Map<string, CANNON.Material> = new Map();
    public RunnersListening = Array<WorldRunner>();
    tickInterval: NodeJS.Timeout;

    worldRooms: Array<WorldRoom>;
    map: IMap;

    constructor() {
        /* var database = new DataBase();
         database.test();*/
        process.title = "Quix World Worker"

        console.log("World 2.0 has started...");
        this.initWorld();
        //this.room = room;

        this.tickInterval = setInterval(() => {
            this.tick(Date.now());
        }, 1);

        new WorldRunner(this).setInterval(() => {
            this.updateObjects(false);
        }, 50)

        //this.createIntervalBox(100, 1000,true);

       this.readMessages();
    }
    readMessages() {
        parentPort.on("message", (message: { type: string, m: any }) => {
            if (message.type == "maxRooms") {
                this.worldRooms = new Array(message.m);
            }
            if (message.type == "addRoom") {
                for (let index = 0; index < this.worldRooms.length; index++) {
                    var element = this.worldRooms[index];
                    if (element == undefined) {
                        element = new WorldRoom(index, message.m.uID, this);
                        this.worldRooms[index] = element;
                        console.log("WorldRoom added to " + index);
                        index = this.worldRooms.length;

                    }

                }
            }
            if (message.type == "removeRoom") {
                this.worldRooms.forEach((element, index) => {
                    if (element != undefined) {
                        if (element.uID == message.m) {
                            this.worldRooms[index] = undefined;
                            element.objects.forEach((val) => {
                                this.cworld.remove(val.body);
                                this.wobjects.delete(val.uID);
                            })
                            console.log("Removed " + element.objects.size + " objects");
                        }
                    }

                });
            }
            if (message.type == "generateMap") {
                this.generateMap(message.m);
            }
            if (message.type == "sincronize") {
                this.updateObjects(true);
            }

            if (message.type == "set") {
                this.setValue(message.m.uID, message.m.value, message.m.v);
            }
            if (message.type == "createBox") {
                var w = this.getWorldRoom(message.m.room);
                w.createObject(message.m.o, message.m.user);
            }
            if (message.type == "createSphere") {
                var w = this.getWorldRoom(message.m.room);
                w.createObject(message.m.o, message.m.user);
            }
            if (message.type == "updateUser") {
                var w = this.getWorldRoom(message.m.room);
                var user = w.users.get(message.m.state.sessionId)
                user.state = message.m.state;
            }
            //Objects messages
            if (message.type == "move") {
                this.wobjects.get(message.m.uID).move(message.m.x, message.m.y);
            }
            if (message.type == "destroy") {
                this.destroyObject(message.m);
            }
            if (message.type == "kill") {
                this.dispose();
            }
            if (message.type == "objectMessage") {
                var room = this.getWorldRoom(message.m.room);
                var object = room.objects.get(message.m.m.uID);
                object.onMessage(message.m.m)
            }

            //Player messages
            if (message.type == "shoot") {
                var mm: ShotMessage = message.m;
                var room = this.getWorldRoom(mm.room);
                var player: Player2 = this.findObjectByTypeAndOwner("Player2", room.uID, mm.client) as Player2;
                player.shootBall(mm);
            }
            if (message.type == "rotateHitBox") {
                var room = this.getWorldRoom(message.m.room)
                var user = room.users.get(message.m.user);
                if (room != undefined && user != undefined) {
                    var player = user.player
                    if (player != undefined) {
                        //player.setHitBoxEulerFromParentQuat(message.m.rot);
                    }
                }
            }
            if (message.type == "rotatePlayer") {
                var room = this.getWorldRoom(message.m.room)
                var user = room.users.get(message.m.user);
                if (room != undefined && user != undefined) {
                    var player = user.player
                    if (player != undefined) {
                        player.rotatePlayer(message.m.delta)
                    }
                }
            }
            if (message.type == "jump") {
                var player: Player2 = this.wobjects.get(message.m.uID) as Player2;
                player.jump();
            }
            if (message.type == "use_Power1") {
                var user = this.getWorldRoom(message.m.room).users.get(message.m.user);
                user.player.use_Power1();
            }

        })
    }
    destroyObject(uID: string) {
        var ob = this.wobjects.get(uID);
        if (ob != undefined) {
            this.cworld.remove(ob.body);
            this.wobjects.delete(uID);
            this.sendMessageToParent("destroy", uID);
        } else {
            console.error("Object not found", uID)
        }
    }
    findObjectsByType(type: string, room: string): WObject[] {
        var found: WObject[] = [];
        var roomW = this.getWorldRoom(room);
        roomW.objects.forEach((value) => {
            if (value.objectState.type == type) {
                found.push(value);
            }
        })

        return found;
    }
    findObjectByTypeAndOwner(type: string, room: string, owner: string): WObject {
        var ob = this.findObjectsByType(type, room);
        var found: WObject;

        ob.forEach(element => {
            if (element.objectState.owner.sessionId == owner) {
                found = element;
            }
        });

        return found;
    }
    getWObjectByBodyID(bodyID: number): WObject {
        var b = undefined;
        this.wobjects.forEach((value) => {
            if (value.body.id == bodyID) {
                b = value;
            }
        });
        return b;
    }

    getWorldRoom(uID: string): WorldRoom {
        var wR = this.worldRooms.find((value, index) => {
            if (value != undefined) {
                if (value.uID == uID) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        });

        return wR;
    }
    removeRunnerListener(ob: WorldRunner) {
        var index = this.RunnersListening.indexOf(ob)
        this.RunnersListening.splice(index, 1);
    }
    setValue(uID: string, value: string, v: any) {
        //console.log("set value " + value, v + " on " + uID, v);
        var wo = this.wobjects.get(uID);
        if (value == "position") {
            wo.setPosition(v.x, v.y, v.z);
        }
        if (value == "rotationQ") {
            wo.setRotationQ(v.x, v.y, v.z, v.w);
        }
    }

    initWorld() {
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -298.3, 0);
        this.setMaterials();
    }
    createSphere(o: WISphere): WObject {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(o.radius) });
        var object = new WISphere();
        object.radius = o.radius;

        var empty = this.createVanilla(o, object, sphere);
        return empty;

    }


    createBox(o: WIBox): WObject {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(new Vec3(o.halfSize.x, o.halfSize.y, o.halfSize.z)) })
        var object = new WIBox();
        object.halfSize.x = o.halfSize.x;
        object.halfSize.y = o.halfSize.y;
        object.halfSize.z = o.halfSize.z;
        var finish = this.createVanilla(o, object, box);

        return finish;
    }

    createVanilla(o: WIBox, state: WIObject, body: Body): WObject {
        state.type = o.type;
        state.instantiate = o.instantiate;
        if (o.mesh != undefined) {
            state.mesh = o.mesh;
        }
        //body.material = this.materials.get(o.material);
        state.material = o.material;

        if (o.uID == undefined) {
            state.uID = c.uniqueId();
        } else {
            state.uID = o.uID
        }
        var wob = this.createWObject(body, state)
        if (o.position == undefined) {
            o.position = c.initializedV3();
            state.position = c.initializedV3();
        }
        if (o.quat == undefined) {
            o.quat = c.initializedQuat();
            state.quat = c.initializedQuat();
        }
        wob.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);
        wob.setPosition(o.position.x, o.position.y, o.position.z);
        if (o.mass == undefined) {
            o.mass = 0;
        }
        wob.changeMass(o.mass);
        this.wobjects.set(state.uID, wob);

        this.cworld.addBody(body);
        wob.onCreated();

        return wob;
    }
    createWObject(body: CANNON.Body, state: WIObject): WObject {
        var newClass: WObject;
        try {
            if ((<any>WObjects)[state.type] != undefined) {
                newClass = new (<any>WObjects)[state.type](state, body, this);
            } else {
                newClass = new WObject(state, body, this);
            }
        } catch (e) {
            console.log("Error: ", e);
        }
        if (newClass == undefined) {
            newClass = new WObject(state, body, this);
        }

        return newClass;
    }

    mapFilterGroup = 1;
   // mapFilterMask = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768 | 65536 | 131072 | 262144 | 524288 | 1048576 | 2097152;

     generateFilterMask(size:number){
        let num =  1;

        for(let a =1;a<=size;a++){
            num+= Math.pow(2,a);
        }
        console.log(num);
        return num;
    }

    mapFilterMask =this.generateFilterMask(WorldInstance.maxRooms);


    generateMap(map: IMap) {
        this.map = map;
        map.objects.forEach((o) => {
            var wOb;
            if ("halfSize" in o) {
                wOb = this.createBox(<IBox>o);
            }
            if ("radius" in o) {
                wOb = this.createSphere(<ISphere>o);
            }
            wOb.body.collisionFilterGroup = this.mapFilterGroup;
            wOb.body.collisionFilterMask = this.mapFilterMask;
            wOb.roomID = "map";
        })
        this.updateObjects(true);
    }
    deleteObject(sob: WObject) {
        this.cworld.remove(sob.body);
        this.sendMessageToParent("deleteObject", sob.objectState.uID);
        this.wobjects.delete(sob.uID);
    }

    maxDelta = 0;
    deltaTime: number = 0;
    fixedTime: number = 0;

    lastTime: number;
    maxSubSteps = 20;

    tick(time: number) {
        var fixedTimeStep = 1.0 / 240.0

        if (this.lastTime != undefined) {
            this.deltaTime = (time - this.lastTime) / 1000;
            this.fixedTime += this.deltaTime;
            if (this.deltaTime > this.maxDelta) {
                this.maxDelta = this.deltaTime;
            }
            this.cworld.step(fixedTimeStep, this.deltaTime, this.maxSubSteps);
        }
        this.lastTime = time;
        //this.sendMessageToParent("time", this.deltaTime);
        //console.log("time", this.deltaTime);

        this.RunnersListening.forEach(element => {
            element.tick();
        });

    }
    isStatic(so: WObject): boolean {
        var minVel = .5;
        if (Math.abs(so.body.velocity.x) < minVel && Math.abs(so.body.velocity.y) < minVel && Math.abs(so.body.velocity.z) < minVel
            && Math.abs(so.body.angularVelocity.x) < minVel && Math.abs(so.body.angularVelocity.y) < minVel && Math.abs(so.body.angularVelocity.z) < minVel
        ) {
            return true;
        } else {
            return false;
        }
    }
    updateObjects(ignoreStatic: boolean) {
        var updates: { ob: WIObject, room: string }[] = [];
        // var updates: ObjectState[] = [];
        this.wobjects.forEach(so => {
            if (so.objectState.instantiate) {
                if (!this.isStatic(so) || ignoreStatic || so.needUpdate || so.alwaysUpdate) {
                    so.updatePositionAndRotation();
                    updates.push({ ob: so.objectState, room: so.roomID });
                }
            }
            if (!so.hasInit) {
                so.hasInit = true;
                so.firstTick();
            }

        });
        // console.log("Bodies ", this.cworld.bodies.length, "time", this.deltaTime, "update", updates.length,"maxDelta",this.maxDelta);
        if (updates.length > 0) {
            this.sendMessageToParent("updateObjects", updates);
        }

    }

    sendMessageToParent(type: string, m: any) {
        var message = {
            type: type,
            m: m
        }
        parentPort.postMessage(message);
    }


    setMaterials() {
        this.materials.set("ballMaterial", new CANNON.Material("ballMaterial"))
        this.materials.set("normalMaterial", new CANNON.Material("normalMaterial"));
        this.materials.set("bouncyMaterial", new CANNON.Material("bouncyMaterial"));
        this.materials.set("stickyMaterial", new CANNON.Material("stickyMaterial"));
    }
    dispose() {
        clearInterval(this.tickInterval);
        console.log("Dispose world 2.0");
        process.exit(0);
    }
}


var world = new SWorld();