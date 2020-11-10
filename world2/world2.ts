import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere, Heightfield, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, PowerState, MapRoomState, PolyObject, TurnPlayerState, ObstacleState } from '../schema/GameRoomState';

import { MapModel, ObjectModel, IObject, IBox, IPoly, ISphere, SphereModel, BoxModel } from '../db/DataBaseSchemas';

import { WBox } from '../db/WorldInterfaces';

import { SObject2 } from './SObject2';
import { c } from '../c';
import { parentPort, workerData } from 'worker_threads';
import { DataBase } from '../db/DataBase';
import { MWorld } from '../world/world';


export class SWorld {
    cworld: CANNON.World;
    sobjects = new Map<string, SObject2>();

    public materials: Map<string, CANNON.Material> = new Map();

    constructor() {
        var database = new DataBase();
        database.test();

        console.log("World 2.0 has started...");
        this.initWorld();
        //this.room = room;

        this.generateMap("tests");

        setInterval(() => {
            this.tick(Date.now());
        }, 1);

        setInterval(() => {
            this.updateState(false);
        }, 50);

        setInterval(() => {
            var box: IBox = new BoxModel()
            box.halfSize = c.createV3(5, 5, 5);
            box.instantiate = true;
            box.quat = c.initializedQuat();
            box.mass = 1;
            box.position = c.createV3(-100, 200, -180);

            this.createBox(box);

        }, 5000);

        parentPort.on("message", (value: { type: string, m: any }) => {
            if (value.type == "createBox") {
                this.createBox(value.m);
            }
        })
    }



    initWorld() {
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -98.3, 0);
        this.setMaterials();
    }
    createSphere(o: ISphere): SObject2 {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(o.radius) });
        sphere.linearDamping = .01;
        sphere.angularDamping = .6;
        var object = new SphereObject();
        object.radius = o.radius;

        var empty = this.createVanilla(o, object, sphere);
        return null;

    }


    createBox(o: WBox) {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(new Vec3(o.halfSize.x, o.halfSize.y, o.halfSize.z)) })
        var object = new BoxObject();
        object.halfSize.x = o.halfSize.x;
        object.halfSize.y = o.halfSize.y;
        object.halfSize.z = o.halfSize.z;
        object.type = o.type;
        object.instantiate = o.instantiate;
        var finish = this.createVanilla(o, object, box);


        if (o.instantiate) {
            var message = {
                type: "createBox",
                m: finish
            }

            parentPort.postMessage(message);
        }
    }

    createVanilla(o: WBox, object: ObjectState, body: Body): ObjectState {
        object.type = o.type;
        object.instantiate = o.instantiate;
        if (o.mesh != undefined) {

            object.mesh = o.mesh;
        }


        //var sobject = this.generateSObject(object, body, client);
        body.material = this.materials.get(o.material);
        if (o.position != undefined) {
            body.position.x = o.position.x;
            body.position.y = o.position.y;
            body.position.z = o.position.z;
        }
        if (o.quat != undefined) {
            body.quaternion.x = o.quat.x;
            body.quaternion.y = o.quat.y;
            body.quaternion.z = o.quat.z;
            body.quaternion.w = o.quat.w;
        }

        object.uID = c.uniqueId();

        this.cworld.addBody(body);
        var sob = new SObject2(object, body);
        sob.changeMass(o.mass);
        this.sobjects.set(object.uID, sob);

        return object;
    }

    generateMap(name: string) {

        MapModel.find({ name: name }, (err, doc) => {
            if (doc.length > 0) {
                var map = doc[0];
                try {
                    map.objects.forEach((o) => {
                        if ("halfSize" in o) {
                            this.createBox(<IBox>o);
                        }
                        if ("radius" in o) {
                            this.createSphere(<ISphere>o);
                        }
                    })
                } catch (e) {
                    console.log(e);
                }

            }
            console.log("World size", this.cworld.bodies.length);
            this.updateState(true);
        });

    }
    deleteObject(sob: SObject2) {
        this.cworld.remove(sob.body);
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
            this.cworld.step(fixedTimeStep, this.deltaTime, this.maxSubSteps);
        }
        this.lastTime = time;
        //parentPort.postMessage(this.fixedTime);
        this.sendMessageToParent("time",this.deltaTime);
        // console.log(this.fixedTime);
    }
    isStatic(so: SObject2): boolean {
        var minVel = 0.1;
        if (Math.abs(so.body.velocity.x) < minVel && Math.abs(so.body.velocity.y) < minVel && Math.abs(so.body.velocity.z) < minVel
            && Math.abs(so.body.angularVelocity.x) < minVel && Math.abs(so.body.angularVelocity.y) < minVel && Math.abs(so.body.angularVelocity.z) < minVel
        ) {
            return true;
        } else {
            return false;
        }
    }
    updateState(ignoreStatic: boolean) {
        var updates: ObjectState[] = [];
        this.sobjects.forEach(so => {
            if (!this.isStatic(so) || ignoreStatic) {
                so.objectState.position.x = MWorld.smallFloat(so.body.position.x);
                so.objectState.position.y = MWorld.smallFloat(so.body.position.y);
                so.objectState.position.z = MWorld.smallFloat(so.body.position.z);

                so.objectState.quaternion.x = MWorld.smallFloat(so.body.quaternion.x);
                so.objectState.quaternion.y = MWorld.smallFloat(so.body.quaternion.y);
                so.objectState.quaternion.z = MWorld.smallFloat(so.body.quaternion.z);
                so.objectState.quaternion.w = MWorld.smallFloat(so.body.quaternion.w);

                updates.push(so.objectState);
            }

        });
       // console.log("Updated " + updates.length);
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
}



var world = new SWorld();