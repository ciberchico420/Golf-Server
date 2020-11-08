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


export class SWorld{
    cworld:CANNON.World;
    sobjects = new Map<string, SObject>();
    
    public materials: Map<string, CANNON.Material> = new Map();
    
    constructor(){
        this.initWorld();
    }

    initWorld() {
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -98.3, 0);
        //this.setMaterials();
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
        if(client != null){
            object.owner = this.getUser(client.sessionId).userState;
            console.log("Owner: "+object.owner.sessionId);
        }

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
        if(client != null){
            object.owner = this.getUser(client.sessionId).userState;
            console.log("Owner: "+object.owner.sessionId);
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

            return new GolfBall(state, body, client, this);
        } else if (state.type == "checkpoint") {
            return new CheckPoint(state, body, client, this);
        }
        else if (state.type == "hole") {
            return new Hole(state, body, client, this);
        }
        else if (state.type == "player") {
            return new Player(state, body, client, this);
        }
        else {
            return new SObject(state, body, client, this);
        }

    }

    getUser(sessionId:string):SUser{
        return null;
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