import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere, Heightfield, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, PowerState, MapRoomState, PolyObject, TurnPlayerState, ObstacleState, Quat, ShotMessage } from '../schema/GameRoomState';

import { MapModel, ObjectModel, IObject, IBox, IPoly, ISphere, SphereModel, BoxModel, IMap } from '../db/DataBaseSchemas';

import { WIBox, WIObject, WISphere } from '../db/WorldInterfaces';

import { WObject } from './Objects/WObject';
import { c } from '../c';
import { parentPort, workerData } from 'worker_threads';
import { DataBase } from '../db/DataBase';
import { MWorld } from '../world/world';
import { first, isMap, values, words, wrap } from 'lodash';
import { Player } from '../world/Objects/Player';
import { Player2 } from './Objects/Player2';
import { WorldRunner } from './WorldRunner';
import { GolfBall2 } from './Objects/GolfBall2';
import { CheckPoint2 } from './Objects/CheckPoint2';
import * as WObjects from './Objects';


export class SWorld {
    cworld: CANNON.World;
    wobjects = new Map<string, WObject>();

    public materials: Map<string, CANNON.Material> = new Map();
    public RunnersListening = Array<WorldRunner>();
    tickInterval: NodeJS.Timeout;
    updateInterval: NodeJS.Timeout;

    worldRooms: Array<WorldRoom>;
    spawnPoint: V3;

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
        }, 10)

        //this.createIntervalBox(100, 1000,true);

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
                //console.log("sincronize");
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
                        player.setHitBoxEulerFromParentQuat(message.m.rot);
                    }
                }
            }
            if (message.type == "jump") {
                var player: Player2 = this.wobjects.get(message.m.uID) as Player2;
                player.jump(message.m.isJumping);
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
        }else{
            console.error("Object not found",uID)
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
    boxesCount = 0;

    createIntervalBox(time: number, maxBoxes: number, instantiate: boolean) {
        var runner = new WorldRunner(this);
        runner.setInterval(() => {
            if (this.boxesCount == maxBoxes) {
                this.removeRunnerListener(runner);
            }
            var box: WIBox = new WIBox()
            box.halfSize = c.createV3(5, 5, 5);
            box.instantiate = instantiate;
            box.quat = c.initializedQuat();
            box.mass = 1;
            box.position = c.createV3(-100, 200, -180);

            this.createBox(box);
            this.boxesCount++;
        }, time);

    }

    initWorld() {
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -298.3, 0);
        this.setMaterials();
    }
    createSphere(o: WISphere): WObject {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(o.radius) });
        var object = new SphereObject();
        object.radius = o.radius;

        var empty = this.createVanilla(o, object, sphere);
        return empty;

    }


    createBox(o: WIBox): WObject {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(new Vec3(o.halfSize.x, o.halfSize.y, o.halfSize.z)) })
        var object = new BoxObject();
        object.halfSize.x = o.halfSize.x;
        object.halfSize.y = o.halfSize.y;
        object.halfSize.z = o.halfSize.z;
        var finish = this.createVanilla(o, object, box);

        return finish;
    }

    createVanilla(o: WIBox, state: ObjectState, body: Body): WObject {
        state.type = o.type;
        state.instantiate = o.instantiate;
        if (o.mesh != undefined) {
            state.mesh = o.mesh;
        }
        body.material = this.materials.get(o.material);
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
            state.quaternion = c.initializedQuat();
        }
        wob.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);
        wob.setPosition(o.position.x, o.position.y, o.position.z);
        if (o.mass == undefined) {
            o.mass = 0;
        }
        wob.changeMass(o.mass);
        //if (o.instantiate) {
        this.wobjects.set(state.uID, wob);
        //}

        this.cworld.addBody(body);
        wob.onCreated();

        return wob;
    }
    createWObject(body: CANNON.Body, state: ObjectState): WObject {
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
    mapFilterMask = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;


    generateMap(map: IMap) {
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

        this.spawnPoint = c.createV3(map.ballspawn.x, map.ballspawn.y, map.ballspawn.z);

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
        // var fixedTimeStep = 1.0 / 60.0
        var fixedTimeStep = 1.0 / 60.0

        if (this.lastTime != undefined) {
            this.deltaTime = (time - this.lastTime) / 1000;
            this.fixedTime += this.deltaTime;
            if (this.deltaTime > this.maxDelta) {
                this.maxDelta = this.deltaTime;
            }
            this.cworld.step(fixedTimeStep, this.deltaTime, this.maxSubSteps);
        }
        this.lastTime = time;
        this.sendMessageToParent("time", this.deltaTime);
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
        var updates: { ob: ObjectState, room: string }[] = [];
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
        var ballMaterial = new CANNON.Material("ballMaterial");
        ballMaterial.friction = 3;
        this.materials.set("ballMaterial", ballMaterial)
        this.materials.set("normalMaterial", new CANNON.Material("normalMaterial"));
        this.materials.set("bouncyMaterial", new CANNON.Material("bouncyMaterial"));
        this.materials.set("stickyMaterial", new CANNON.Material("stickyMaterial"));

        var ballWithNormal = new CANNON.ContactMaterial(
            this.materials.get("ballMaterial"),      // Material #1
            this.materials.get("normalMaterial"),      // Material #2
            {
                friction: .9,//.1,
                restitution: .2
            }        // friction coefficient
        );

        var normalWithNormal = new CANNON.ContactMaterial(
            this.materials.get("normalMaterial"),      // Material #1
            this.materials.get("normalMaterial"),      // Material #2
            {
                friction: .1,
                restitution: .1
            }        // friction coefficient
        );

        var ballWithBouncy = new CANNON.ContactMaterial(
            this.materials.get("ballMaterial"),      // Material #1
            this.materials.get("bouncyMaterial"),      // Material #2
            {
                friction: 1,
                restitution: 3
            }        // friction coefficient
        );

        var stickyBall = new CANNON.ContactMaterial(
            this.materials.get("ballMaterial"),      // Material #1
            this.materials.get("stickyMaterial"),      // Material #2
            {
                friction: .0001,
                restitution: .1
            }        // friction coefficient
        );
        this.cworld.addContactMaterial(ballWithNormal);
        this.cworld.addContactMaterial(normalWithNormal);
        this.cworld.addContactMaterial(ballWithBouncy);
        this.cworld.addContactMaterial(stickyBall);
    }
    dispose() {

        clearInterval(this.tickInterval);
        clearInterval(this.updateInterval);
        console.log("Dispose world 2.0");
        process.exit(0);
    }
}
export class WorldRoom {
    filterGroup: number;
    uID: string;

    objects: Map<string, WObject> = new Map();
    users: Map<string, WorldUser> = new Map();
    world: SWorld;
    timeToRespawn:number = 3000;

    constructor(index: number, uID: string, world: SWorld) {
        this.world = world;
        this.filterGroup = Math.pow(2, index + 1);
        this.uID = uID;
        console.log("World " + uID + " has been assigned to filterGroup " + this.filterGroup);
        this.setState("turnState", "turn", 1);
    }
    getWObject(bodyID: number): WObject {

        this.objects.forEach((value) => {
            if (value.body.id == bodyID) {
                return value;
            }
        });
        return null;

    }

    findUserByHitBox(hitboxBody: Body): WorldUser {
        var found: WorldUser;
        this.users.forEach(val => {
            if (val.player.hitBox.body == hitboxBody) {

                found = val;
            }
        })
        return found;
    }

    createObject(object: WIObject, owner: string) {
        if ("halfSize" in object) {
            var ob = this.world.createBox(object);
        }
        if ("radius" in object) {
            var ob = this.world.createSphere(object);
        }

        var us = new UserState();
        us.sessionId = owner;
        ob.objectState.owner = us;
        ob.body.collisionFilterGroup = this.filterGroup;
        ob.body.collisionFilterMask = 1 | this.filterGroup;
        ob.roomID = this.uID;
        this.objects.set(ob.uID, ob);
        ob.needUpdate = true;
        return ob;
    }

    setState(path: string, property: string, value: any) {
        this.world.sendMessageToParent("setState", { path: path, property: property, value: value, room: this.uID });
    }
}

export class WorldUser {
    world: SWorld;
    sessionId: string;
    room: WorldRoom;
    gems: number = 0;
    player: Player2;
    constructor(world: SWorld, clientID: string, room: WorldRoom) {
        this.world = world;
        this.sessionId = clientID;
        this.room = room;

        this.addGemsRunner();
    }
    public updateGems() {
        this.room.setState("users." + this.sessionId, "gems", this.gems);
    }

    private addGemsRunner() {
        new WorldRunner(this.world).setInterval(() => {
            this.gems += 10;
            this.room.setState("users." + this.sessionId, "gems", this.gems);
        }, 10000)
    }
}


var world = new SWorld();