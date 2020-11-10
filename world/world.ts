import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere, Heightfield, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, PowerState, MapRoomState, PolyObject, TurnPlayerState, ObstacleState } from '../schema/GameRoomState';
import { SObject } from './SObject';
import { GameRoom } from '../rooms/GameRoom';
import { MapsRoom } from '../rooms/MapsRoom';
import { MapModel, ObjectModel, IObject, IBox, IPoly, ISphere, SphereModel } from '../db/DataBaseSchemas';
import { ModelsLoader } from './loadModels';
import { SUser } from './SUser';
import * as Obstacles from './Obstacles';
import { Obstacle } from './Obstacles';
import { GolfBall } from './Objects/GolfBall';
import { CheckPoint } from './Objects/CheckPoint';
import { Hole } from './Objects/Hole';
import { Player } from './Objects/Player';
import { WBox } from '../db/WorldInterfaces';

export class MWorld {

    cworld: CANNON.World;
    sobjects = new Map<string, SObject>();
    state: GameState;
    room: GameRoom;
    static golfBallSize: number = 1;
    golfBallSize = MWorld.golfBallSize;

    public ballSpawn: { x: number, y: number, z: number };
    public modelsLoader: ModelsLoader;

    public extraPoints: [{ name: String, x: number, y: number, z: number }]

    public drawPhysics = true;

    public sObstacles = new Map<string, Obstacle>();

    //Materials

    public materials: Map<string, CANNON.Material> = new Map();
    deltaTime: number = 0;
    fixedTime: number = 0;

    constructor(room: GameRoom, state: GameState) {
        this.room = room;
        this.initWorld();

        this.state = state;


        this.modelsLoader = new ModelsLoader();

    }

    initWorld() {
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -98.3, 0);
        this.setMaterials();
    }




    createSphere(o: ISphere, client: Client) {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(o.radius) });
        sphere.linearDamping = .01;
        sphere.angularDamping = .6;
        var object = new SphereObject();
        object.radius = o.radius;
        if (client != null) {
            object.owner = new UserState();
            object.owner.sessionId = client.sessionId;
        }
        object.instantiate = o.instantiate;
        object.type = o.type;
        object.owner = client != null ? this.room.users.get(client.sessionId).userState : null;

        if (o.mesh != undefined) {

            object.mesh = o.mesh;
        }


        var sObj: SObject = this.generateSObject(object, sphere, client);
        if (o.position != undefined) {
            sObj.setPosition(o.position.x, o.position.y, o.position.z);
        }
        if (o.quat != undefined) {
            sObj.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);
        }
        sObj.changeMass(o.mass);

        sObj.body.material = this.materials.get(o.material);

        object.uID = sObj.uID;


        this.sobjects.set(sObj.uID, sObj);
        this.cworld.addBody(sphere);
        this.state.world.objects[sObj.uID] = object;

        return sObj;
    }


    createBox(o: WBox, client: Client) {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(new Vec3(o.halfSize.x, o.halfSize.y, o.halfSize.z)) })
        var object = new BoxObject();
        object.halfSize.x = o.halfSize.x;
        object.halfSize.y = o.halfSize.y;
        object.halfSize.z = o.halfSize.z;
        object.type = o.type;
        object.instantiate = o.instantiate;
        if (client != null) {
            object.owner = this.room.users.get(client.sessionId).userState;
            console.log("Owner: " + object.owner.sessionId);
        }
        if (o.mesh != undefined) {

            object.mesh = o.mesh;
        }


        var sobject = this.generateSObject(object, box, client);
        sobject.body.material = this.materials.get(o.material);
        if (o.position != undefined) {
            sobject.setPosition(o.position.x, o.position.y, o.position.z);
        }
        if (o.quat != undefined) {
            sobject.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);
        }

        sobject.changeMass(o.mass);
        object.uID = sobject.uID;



        this.sobjects.set(sobject.uID, sobject);
        this.cworld.addBody(box);
        if (object.instantiate) {
            this.state.world.objects[sobject.uID] = object;
        }
        return sobject;
    }

    generateSObject(state: ObjectState, body: CANNON.Body, client: Client) {
        if (state.type == "golfball") {

            return new GolfBall(state, body, client, this.room);
        } else if (state.type == "checkpoint") {
            return new CheckPoint(state, body, client, this.room);
        }
        else if (state.type == "hole") {
            return new Hole(state, body, client, this.room);
        }
        else if (state.type == "player") {
            return new Player(state, body, client, this.room);
        }
        else {
            return new SObject(state, body, client, this.room);
        }

        return new SObject(state, body, client, this.room);

    }


    generateMap(name: string, client: Client) {

        this.room.State.mapName = name;

        MapModel.find({ name: name }, (err, doc) => {
            if (doc.length > 0) {
                var map = doc[0];
                try {

                    this.ballSpawn = { x: map.ballspawn.x, y: map.ballspawn.y, z: map.ballspawn.z };
                    this.room.users.forEach(value => {
                        value.golfball.setPosition(this.ballSpawn.x, this.ballSpawn.y, this.ballSpawn.z);
                    });


                    map.objects.forEach((o) => {
                        if ("halfSize" in o) {
                            this.createBox(<IBox>o, client);
                        }
                        if ("radius" in o) {
                            this.createSphere(<ISphere>o, client);
                        }
                    })

                    map.tiles.forEach((t) => {
                        var ob = new ObjectState();
                        ob.position.x = t.position.x;
                        ob.position.y = t.position.y;
                        ob.position.z = t.position.z;
                        ob.type = "" + t.tile;

                        this.state.world.tiles.push(ob);
                    });

                    map.obstacles.forEach((t) => {
                        var ob = new ObstacleState();
                        ob.position.x = t.position.x;
                        ob.position.y = t.position.y;
                        ob.position.z = t.position.z;

                        ob.quaternion.x = t.quat.x;
                        ob.quaternion.y = t.quat.y;
                        ob.quaternion.z = t.quat.z;
                        ob.quaternion.w = t.quat.w;
                        ob.objectname = "" + t.objectname;

                        ob.uID = t.uID;

                        this.state.world.obstacles.push(ob);
                        var className = t.objectname.split("/")[1];
                        //console.log(className);
                        var newClass: Obstacle = new (<any>Obstacles)[className + "_Obstacle"](this.room, ob, t.extrapoints);
                        this.sObstacles.set(ob.uID, newClass);



                    });
                } catch (e) {
                    console.log(e);
                }

            }


        });
    }
    deleteObject(sob: SObject) {
        delete this.state.world.objects[sob.uID];
        this.cworld.remove(sob.body);
        this.sobjects.delete(sob.uID);
    }


    // Start the simulation loop
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
    }


    static smallFloat(f: number) {
        var num = parseFloat(f.toFixed(3));
        return num;
    }

    updateState() {
        this.sobjects.forEach(element => {
            if (element.objectState.instantiate) {
                if (element.lastPosition == undefined || element.lastRotation == undefined
                    || element.body.position != element.lastPosition || element.body.quaternion != element.lastRotation) {

                    //if (element.body.mass != 0) {
                        element.objectState.position.x = MWorld.smallFloat(element.body.position.x);
                        element.objectState.position.y = MWorld.smallFloat(element.body.position.y);
                        element.objectState.position.z = MWorld.smallFloat(element.body.position.z);

                        element.objectState.quaternion.x = MWorld.smallFloat(element.body.quaternion.x);
                        element.objectState.quaternion.y = MWorld.smallFloat(element.body.quaternion.y);
                        element.objectState.quaternion.z = MWorld.smallFloat(element.body.quaternion.z);
                        element.objectState.quaternion.w = MWorld.smallFloat(element.body.quaternion.w);
                    //}

                } else {
                    element.lastPosition = element.body.position;
                    element.lastRotation = element.body.quaternion;
                }

            }
            //console.log(element.objectState.type,element.uID,element.objectState.uID);



        });
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

}

