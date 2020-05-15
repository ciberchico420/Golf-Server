import { Room, Client } from 'colyseus';
import CANNON, { Vec3, Quaternion, Sphere } from 'cannon';
import { GameState, V3, ObjectState, SphereObject, BoxObject, UserState } from '../schema/GameRoomState';
import { MBody } from './SObject';
import { MyRoom } from '../rooms/GameRoom';

export class MWorld {

    cworld: CANNON.World;
    mbodies = new Array<MBody>();
    state: GameState;
    physicsMaterial: CANNON.Material;
    otherMaterial: CANNON.Material;
    room: MyRoom;
    static golfBallSize: number = 5;
    golfBallSize = MWorld.golfBallSize;

    constructor(room: MyRoom, state: GameState) {
        this.room = room;
        this.cworld = new CANNON.World();
        this.cworld.gravity.set(0, -600, 0);
        this.setMaterials();
        this.state = state;



        this.createMap();
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


        this.state.world.objects[sphere.id] = object;
        var mbody = new MBody(object, sphere, client);
        this.mbodies.push(mbody);
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

        this.state.world.objects[box.id] = object;
        var mbody = new MBody(object, box, client);
        this.mbodies.push(mbody);
        this.cworld.addBody(box);

        return mbody;
    }

    createMap() {
        var piso = this.createBox(new CANNON.Vec3(60, 1, 250), null);
        

        var paredIz = this.createBox(new CANNON.Vec3(3, 10, 300), null);
        paredIz.setPosition(-60, 5, 0);
        paredIz.objectState.type = "wall";
        var paredDe = this.createBox(new CANNON.Vec3(3, 10, 300), null);
        paredDe.setPosition(60, 5, 0);
        paredDe.objectState.type = "wall";

        var paredEnf = this.createBox(new CANNON.Vec3(60, 10, 3), null)
        paredEnf.setPosition(0, 5, -300)
        paredEnf.objectState.type = "wall";

        var paredFin = this.createBox(new CANNON.Vec3(60, 10, 3), null)
        paredFin.setPosition(0, 5, 300)
        paredFin.objectState.type = "wall";


        //piso.setRotation(0.26, 0, 0);
        //this.createHole();

        var paredInclinada = this.createBox(new Vec3(60,1,30),null);
        paredInclinada.setPosition(0,0,-270);

        this.createHex(new Vec3(0,-2,256.1));

        var paredCubre = this.createBox(new Vec3(28,1,50),null);
        paredCubre.setPosition(-34.1,0,250);

        var paredCubreDe = this.createBox(new Vec3(28,1,50),null);
        paredCubreDe.setPosition(34.1,0,250);
        
        var paredFrente =this.createBox(new Vec3(6.2,1,20),null);
        paredFrente.setPosition(0,0,283);
    }

    collideWithHole(e: any) {


        if (this.state.world.objects[e.body.id].type == "golfball") {
            console.log("colide with " + this.state.world.objects[e.body.id].type);

            var ganador = (<ObjectState>this.state.world.objects[e.body.id]).owner.sessionId;

            this.room.users.get(ganador).setWin();
        }



        // delete this.state.world.objects[e.body.id];


    }


    createHex(position:Vec3) {

    var number_of_chunks = 12;
    var angle=0;
    var rad = this.golfBallSize+2;

    for (var i = 0; i < number_of_chunks; i++)
    {
        var x,y,x2,y2;
        var angle = i * (360 / number_of_chunks);
        var degree = (angle * Math.PI / 180);
        x = 0 + rad * Math.cos(degree);
       y = 0 + rad * Math.sin(degree);

        //printf("x-> %d y-> %d \n", x_p[i], y_p[i]);
        var b = this.createBox(new Vec3(1, 5, (360/10)/number_of_chunks), null);

        b.objectState.type = "holewall"
        
        b.setPosition(x+position.x, position.y, y+position.z);
        b.setRotation(0,-(angle*0.0174533),0);
    }

    var touchContact =  this.createBox(new Vec3(this.golfBallSize+1,1,this.golfBallSize+1),null);
    touchContact.setPosition(position.x,position.y-(5),position.z);
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
                friction: .9,
                restitution: .5
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
        var num = parseFloat(f.toFixed(1));
        return num;
    }

    updateState() {
        this.mbodies.forEach(element => {


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

