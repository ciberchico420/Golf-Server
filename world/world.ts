import { Room, Client, matchMaker } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere, Heightfield, Body } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState, Power, MapRoomState } from '../schema/GameRoomState';
import { SObject } from './SObject';
import { GameRoom } from '../rooms/GameRoom';
import { MapsRoom } from '../rooms/MapsRoom';
import { MapModel, ObjectModel, IObject, IBox } from '../db/GolfSchemas';

export class MWorld {

    cworld: CANNON.World;
    sobjects = new Map<string, SObject>();
    state: GameState;
    physicsMaterial: CANNON.Material;
    otherMaterial: CANNON.Material;
    room: GameRoom;
    static golfBallSize: number = 5;
    golfBallSize = MWorld.golfBallSize;

    mapRoom: MapsRoom;

    public ballSpawn:{x:number,y:number,z:number};

    constructor(room: GameRoom, state: GameState) {
        this.room = room;
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -600, 0);
        this.setMaterials();
        this.state = state;


        //this.createMap();
       this.generateMap("mapa",null);

       

    }



    createSphere(radius: number, client: Client) {
        var sphere = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Sphere(radius), material: this.physicsMaterial });
        sphere.linearDamping = .9;
        sphere.angularDamping = .9;
        var object = new SphereObject();
        object.radius = radius;
        if (client != null) {
            object.owner = new UserState();
            object.owner.sessionId = client.sessionId;
        }

        var mbody = new SObject(object, sphere, client);
        this.state.world.objects[sphere.id] = object;

        this.sobjects.set(mbody.uID, mbody);
        this.cworld.addBody(sphere);
        return mbody;
    }
    createBox(msize: CANNON.Vec3, client: Client) {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(msize), material: this.physicsMaterial })
        var object = new BoxObject();
        object.halfSize.x = msize.x;
        object.halfSize.y = msize.y;
        object.halfSize.z = msize.z;
        object.type = "box";
        var mbody = new SObject(object, box, client);
        this.state.world.objects[box.id] = object;

        this.sobjects.set(mbody.uID, mbody);
        this.cworld.addBody(box);

        return mbody;
    }

    createBox2(o: IBox,client:Client) {
        var box = new CANNON.Body({ type: CANNON.Body.DYNAMIC, shape: new CANNON.Box(new Vec3(o.halfSize.x, o.halfSize.y, o.halfSize.z)), material: this.physicsMaterial })
        var object = new BoxObject();
        object.halfSize.x = o.halfSize.x;
        object.halfSize.y = o.halfSize.y;
        object.halfSize.z = o.halfSize.z;
        object.type = o.type;

        var sobject = new SObject(object, box, client);
        sobject.setPosition(o.position.x,o.position.y,o.position.z);
        sobject.setRotationQ(o.quat.x,o.quat.y,o.quat.z,o.quat.w);
        this.state.world.objects[box.id] = object;
        this.sobjects.set(sobject.uID, sobject);
        this.cworld.addBody(box);
    }


    generateMap(name: string,client:Client) {

        MapModel.find({ name: name }, (err, doc) => {
            if (doc.length > 0) {
                var map = doc[0];
                map.objects.forEach((o) => {
                    if (o.type == "box") {
                        this.createBox2(<IBox>o,client);
                    }
                    if (o.type == "ballspawn") {
                       this.ballSpawn = {x:o.position.x,y:o.position.y,z:o.position.z};
                    }
                    if(o.type =="hole"){

                        var plus = 1.5;
                        this.createHex(new CANNON.Vec3(o.position.x,o.position.y,o.position.z),o.radius-plus);
                    }
                    if (o.type == "addmass") {
                        this.createPower(<IBox>o);
                    }
                })
            }
        });
    }


    createPower(o:IBox) {

        var addMassPower = this.createSphere(5, null);
        addMassPower.objectState.type = "power";
        // addMassPower.setPosition(50,30,200);
        addMassPower.setPosition(o.position.x,o.position.y,o.position.z);
        addMassPower.objectState.instantiate = false;

        addMassPower.body.collisionResponse = false;
        this.sobjects.set(addMassPower.uID, addMassPower);
        addMassPower.body.addEventListener("collide", (e: any) => {
            if (this.state.world.objects[e.body.id].type == "golfball") {
                var golfball: ObjectState = this.state.world.objects[e.body.id];
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
        this.cworld.remove(sob.body);
        this.sobjects.delete(sob.uID);
        delete this.state.world.objects[sob.body.id];
    }

    collideWithHole(e: any) {


        if (this.state.world.objects[e.body.id].type == "golfball") {

            var ganador = (<ObjectState>this.state.world.objects[e.body.id]).owner.sessionId;

            this.room.users.get(ganador).setWin();
        }



        // delete this.state.world.objects[e.body.id];


    }


    createHex(position: Vec3, size:number) {

        var number_of_chunks = 12;
        var angle = 0;
        var rad = size + 2;

        for (var i = 0; i < number_of_chunks; i++) {
            var x, y, x2, y2;
            var angle = i * (360 / number_of_chunks);
            var degree = (angle * Math.PI / 180);
            x = 0 + rad * Math.cos(degree);
            y = 0 + rad * Math.sin(degree);

            //printf("x-> %d y-> %d \n", x_p[i], y_p[i]);
            var b = this.createBox(new Vec3(1, 5, (360 / 10) / number_of_chunks), null);

            b.objectState.type = "holewall"

            b.setPosition(x + position.x, position.y, y + position.z);
            b.setRotation(0, -(angle * 0.0174533), 0);
        }

        var touchContact = this.createBox(new Vec3(size + 1, 1, size + 1), null);
        touchContact.setPosition(position.x, position.y - (5), position.z);
        touchContact.objectState.type = "hole";

        touchContact.body.addEventListener("collide", (e: any) => {
            this.collideWithHole(e);

        });



    }

    setMaterials() {
        this.physicsMaterial = new CANNON.Material("material");;

        var physicsContactMaterial = new CANNON.ContactMaterial(
            this.physicsMaterial,      // Material #1
            this.physicsMaterial,      // Material #2
            {
                friction: .1,
                restitution: .2
            }        // friction coefficient
        );

        this.cworld.addContactMaterial(physicsContactMaterial);
    }


    // Start the simulation loop
    lastTime: number;

    tick() {

        var fixedTimeStep = 1.0 / 60.0;
        this.updateState();
        this.cworld.step(fixedTimeStep);




    }

    static smallFloat(f: number) {
        var num = parseFloat(f.toFixed(3));
        return num;
    }

    updateState() {
        this.sobjects.forEach(element => {


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

