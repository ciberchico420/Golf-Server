import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere, Heightfield, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, PowerState, MapRoomState, PolyObject, TurnPlayerState, ObstacleState } from '../schema/GameRoomState';

import { MapModel, ObjectModel, IObject, IBox, IPoly, ISphere, SphereModel, BoxModel, IMap } from '../db/DataBaseSchemas';

import { WIBox } from '../db/WorldInterfaces';

import { WObject } from './WObject';
import { c } from '../c';
import { parentPort, workerData } from 'worker_threads';
import { DataBase } from '../db/DataBase';
import { MWorld } from '../world/world';
import { isMap, wrap } from 'lodash';
import { Player } from '../world/Objects/Player';
import { Player2 } from './Objects/Player2';
import { WorldRunner } from './WorldRunner';


export class SWorld {
    cworld: CANNON.World;
    wobjects = new Map<string, WObject>();

    public materials: Map<string, CANNON.Material> = new Map();
    public RunnersListening = Array<WorldRunner>();
    tickInterval: NodeJS.Timeout;
    updateInterval: NodeJS.Timeout;

    worldRooms: Array<WorldRoom>;

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

        // this.createIntervalBox(100, 1000,true);
        //this.createPlayer();

        parentPort.on("message", (message: { type: string, m: any }) => {
            if (message.type == "maxRooms") {
                this.worldRooms = new Array(message.m);
            }
            if (message.type == "addRoom") {
                for (let index = 0; index < this.worldRooms.length; index++) {
                    var element = this.worldRooms[index];
                    if (element == undefined) {
                        element = new WorldRoom(index, message.m.uID);
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
                var ob = this.createBox(message.m.o);
                var us = new UserState();
                us.sessionId = message.m.user;
                ob.objectState.owner = us;
                var w = this.getWorldRoom(message.m.room);
                ob.body.collisionFilterGroup = w.filterGroup;
                ob.body.collisionFilterMask = 1 | w.filterGroup;
                ob.roomID = w.uID;
                w.objects.set(ob.uID, ob);
            }
            //Objects messages
            if (message.type == "move") {
                this.wobjects.get(message.m.uID).move(message.m.x, message.m.y, message.m.rotX, message.m.rotZ);
            }
            if (message.type == "destroy") {
                console.log(message.m);
                this.destroyObject(message.m);
            }
            if (message.type == "kill") {
                this.dispose();
            }
        })
    }
    destroyObject(uID: string) {
        var ob = this.wobjects.get(uID);
        this.cworld.remove(ob.body);
        this.wobjects.delete(uID);
        this.sendMessageToParent("destroy", uID);
        //Need to delete from WorldRooms
    }

    getWorldRoom(uID: string): WorldRoom {
        var wR = this.worldRooms.find((value, index) => {
            if (value != undefined) {
                if (value.uID == uID) {
                    return true;
                } else {
                    return false;
                }
            }else{
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
        console.log("set value " + value, v + " on " + uID, v);
        var wo = this.wobjects.get(uID);
        if (value == "position") {
            wo.setPosition(v.x, v.y, v.z);
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
            box.quat = c.initializedQuat();

            this.createBox(box);
            this.boxesCount++;
        }, time);

    }

    initWorld() {
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -98.3, 0);
        this.setMaterials();
    }
    createSphere(o: ISphere): WObject {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(o.radius) });
        sphere.linearDamping = .01;
        sphere.angularDamping = .6;
        var object = new SphereObject();
        object.radius = o.radius;

        var empty = this.createVanilla(o, object, sphere);
        return null;

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


        //var sobject = this.generateSObject(object, body, client);
        body.material = this.materials.get(o.material);

        if (o.uID == undefined) {
            state.uID = c.uniqueId();
        } else {
            state.uID = o.uID
        }
        var wob = this.createWObject(body, state)
        wob.setPosition(o.position.x, o.position.y, o.position.z);

        wob.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);


        wob.changeMass(o.mass);
        if (o.instantiate) {
            this.wobjects.set(state.uID, wob);
        }

        this.cworld.addBody(body);

        return wob;
    }
    createWObject(body: CANNON.Body, state: ObjectState): WObject {
        if (state.type == "player") {
            return new Player2(state, body, this);
        } else {
            return new WObject(state, body, this);
        }
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
        this.updateObjects(true);

    }
    deleteObject(sob: WObject) {
        this.cworld.remove(sob.body);
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
                if (!this.isStatic(so) || ignoreStatic || so.needUpdate) {
                    so.updatePositionAndRotation();
                    updates.push({ ob: so.objectState, room: so.roomID });
                }
            }


        });
        // console.log("Bodies ", this.cworld.bodies.length, "time", this.deltaTime, "update", updates.length,"maxDelta",this.maxDelta);
        if (updates.length > 0) {
            this.sendMessageToParent("updateBodies", updates);
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
        this.materials.set("bouncyMaterial", new CANNON.Material("normalMaterial"));

        var ballWithNormal = new CANNON.ContactMaterial(
            this.materials.get("ballMaterial"),      // Material #1
            this.materials.get("normalMaterial"),      // Material #2
            {
                friction: .1,
                restitution: .5
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


        this.cworld.addContactMaterial(ballWithNormal);
        this.cworld.addContactMaterial(normalWithNormal);
        this.cworld.addContactMaterial(ballWithBouncy);
    }
    dispose() {

        clearInterval(this.tickInterval);
        clearInterval(this.updateInterval);
        console.log("Dispose world 2.0");
        process.exit(0);
    }
}
class WorldRoom {
    filterGroup: number;
    uID: string;

    objects: Map<string, WObject> = new Map();

    constructor(index: number, uID: string) {
        this.filterGroup = Math.pow(2, index + 1);
        this.uID = uID;
        console.log("World " + uID + " has been assigned to filterGroup " + this.filterGroup);
    }
}


var world = new SWorld();