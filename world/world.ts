import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere, Heightfield, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, Power, MapRoomState, PolyObject, TurnPlayerState } from '../schema/GameRoomState';
import { SObject } from './SObject';
import { GameRoom } from '../rooms/GameRoom';
import { MapsRoom } from '../rooms/MapsRoom';
import { MapModel, ObjectModel, IObject, IBox, IPoly, ISphere, SphereModel } from '../db/DataBaseSchemas';
import { ModelsLoader } from './loadModels';

export class MWorld {

    cworld: CANNON.World;
    sobjects = new Map<string, SObject>();
    state: GameState;
    room: GameRoom;
    static golfBallSize: number = 5;
    golfBallSize = MWorld.golfBallSize;

    mapRoom: MapsRoom;

    public ballSpawn: { x: number, y: number, z: number };
    public modelsLoader: ModelsLoader;

    //Materials

    public materials: Map<string, CANNON.Material> = new Map();

    constructor(room: GameRoom, state: GameState) {
        this.room = room;
        this.initWorld();
        
        this.state = state;

        //this.generateMap("mapa", null);

        this.modelsLoader = new ModelsLoader();

    }

    initWorld(){
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -198.3, 0);
        this.setMaterials();
    }



    createSphere(o: ISphere, client: Client) {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(o.radius) });
        sphere.linearDamping = .1;
        sphere.angularDamping = .8;
        var object = new SphereObject();
        object.radius = o.radius;
        if (client != null) {
            object.owner = new UserState();
            object.owner.sessionId = client.sessionId;
        }

        var sObj = new SObject(object, sphere, client);
        sObj.body.material = this.materials.get(o.material);

        object.uID = sObj.uID;
        

        this.sobjects.set(sObj.uID, sObj);
        this.cworld.addBody(sphere);
        this.state.world.objects[sObj.uID] = object;
        return sObj;
    }


    createBox(o: IBox, client: Client) {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(new Vec3(o.halfSize.x, o.halfSize.y, o.halfSize.z)) })
        var object = new BoxObject();
        object.halfSize.x = o.halfSize.x;
        object.halfSize.y = o.halfSize.y;
        object.halfSize.z = o.halfSize.z;
        object.type = o.type;

        var sobject = new SObject(object, box, client);
        sobject.body.material = this.materials.get(o.material);
        sobject.setPosition(o.position.x, o.position.y, o.position.z);
        sobject.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);
        object.uID = sobject.uID;
       
        

        this.sobjects.set(sobject.uID, sobject);
        this.cworld.addBody(box);
        this.state.world.objects[sobject.uID] = object;

        return sobject;
    }

    createPoly(o: IPoly) {
        /*var sObj = this.modelsLoader.loadModel(<IPoly>o);
        sObj.body.material = this.materials.get(o.material);
        sObj.setPosition(o.position.x, o.position.y, o.position.z);
        sObj.setRotationQ(o.quat.x, o.quat.y, o.quat.z, o.quat.w);
        this.state.world.objects[sObj.body.id] = sObj.objectState;
        this.sobjects.set(sObj.uID, sObj);
        this.cworld.addBody(sObj.body);*/
    }


    generateMap(name: string, client: Client) {
        this.room.State.mapName = name;

        MapModel.find({ name: name }, (err, doc) => {
            if (doc.length > 0) {
                var map = doc[0];
                map.objects.forEach((o) => {
                    if (o.type == "box") {
                        this.createBox(<IBox>o, client);
                    }
                    if (o.type == "ballspawn") {
                        this.ballSpawn = { x: o.position.x, y: o.position.y, z: o.position.z };
                        
                    }
                    if (o.type == "checkpoint") {
                        var mo: SObject = this.createBox(<IBox>o, client);
                        mo.body.collisionResponse = false;

                        mo.body.addEventListener("collide", (e: any) => {
                            if (this.state.world.objects[mo.uID].type == "golfball") {
                                var ball: SphereObject = this.state.world.objects[mo.uID];

                                this.state.turnState.players[ball.owner.sessionId].checkpoint.x = o.position.x;
                                this.state.turnState.players[ball.owner.sessionId].checkpoint.y = o.position.y;
                                this.state.turnState.players[ball.owner.sessionId].checkpoint.z = o.position.z;

                            }
                        });
                    }
                    if (o.type == "hole") {
                        var mo: SObject = this.createBox(<IBox>o, client);
                        mo.body.collisionResponse = false;
                       
                        mo.body.addEventListener("collide", (e: any) => {
                             
                             var object:SObject = undefined;
                             this.sobjects.forEach(element => {
                                if(e.body.id == element.body.id)
                                {
                                    //console.log("Found",element);
                                    object = element;
                                }
                                    
                                 
                             });

                             console.log("Collided with ",object.objectState.type);

                            if (object.objectState.type == "golfball") {
                                console.log("Collided with hole**");
                                this.room.setWinner(object.objectState)
                            }
                        });
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
            }
        });
    }


    createPower(o: IBox) {

        var addMassPower = this.createSphere(new SphereModel({ radius: 5 }), null);
        addMassPower.objectState.type = "power";
        // addMassPower.setPosition(50,30,200);
        addMassPower.setPosition(o.position.x, o.position.y, o.position.z);
        addMassPower.objectState.instantiate = false;

        addMassPower.body.collisionResponse = false;
        this.sobjects.set(addMassPower.uID, addMassPower);
        addMassPower.body.addEventListener("collide", (e: any) => {
            if (this.state.world.objects[addMassPower.uID].type == "golfball") {
                var golfball: ObjectState = this.state.world.objects[addMassPower.uID];
                var power = new Power();

                power.owner = this.state.users[golfball.owner.sessionId];
                this.state.bags[power.owner.sessionId].objects[addMassPower.uID] = power;
                power.type = "addmass";
                power.uID = addMassPower.uID;
                power.UIName = "Add mass"
                power.turns = 2;
                power.UIDesc = "Add +5 of mass for " + power.turns + " turns.";

                var esto = this;


                setTimeout(function () {
                    esto.deleteObject(addMassPower);
                }, 0);



            }

        });
    }

    deleteObject(sob: SObject) {
        delete this.state.world.objects[sob.uID];
        this.cworld.remove(sob.body);
        this.sobjects.delete(sob.uID);
        
    }

    setMaterials() {

        this.materials.set("ballMaterial", new CANNON.Material("ballMaterial"))
        this.materials.set("normalMaterial", new CANNON.Material("normalMaterial"));
        this.materials.set("bouncyMaterial", new CANNON.Material("normalMaterial"));

        var ballWithNormal = new CANNON.ContactMaterial(
            this.materials.get("ballMaterial"),      // Material #1
            this.materials.get("normalMaterial"),      // Material #2
            {
                friction: .04,
                restitution: .4
            }        // friction coefficient
        );

        var normalWithNormal = new CANNON.ContactMaterial(
            this.materials.get("normalMaterial"),      // Material #1
            this.materials.get("normalMaterial"),      // Material #2
            {
                friction: 1,
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


    // Start the simulation loop
    lastTime: number;
    maxSubSteps = 20;

    tick(time: number) {
        var fixedTimeStep = 1.0 / 60.0
        /*;
        this.updateState();
        this.cworld.step(fixedTimeStep);*/
    

        if (this.lastTime != undefined) {
           
            var dt = (time - this.lastTime) / 1000;
            
            this.cworld.step(fixedTimeStep, dt, this.maxSubSteps);
            this.updateState(); 
        }
        this.lastTime = time;
    }


    static smallFloat(f: number) {
        var num = parseFloat(f.toFixed(3));
        return num;
    }

    updateState() {
        this.sobjects.forEach(element => {
            //console.log(element.objectState.type,element.uID,element.objectState.uID);
            element.objectState.position.x = MWorld.smallFloat(element.body.position.x);
            element.objectState.position.y = MWorld.smallFloat(element.body.position.y);
            element.objectState.position.z = MWorld.smallFloat(element.body.position.z);

            element.objectState.quaternion.x = MWorld.smallFloat(element.body.quaternion.x);
            element.objectState.quaternion.y = MWorld.smallFloat(element.body.quaternion.y);
            element.objectState.quaternion.z = MWorld.smallFloat(element.body.quaternion.z);
            element.objectState.quaternion.w = MWorld.smallFloat(element.body.quaternion.w);


        });
    }
}

