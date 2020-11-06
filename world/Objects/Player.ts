import { Constraint, PointToPointConstraint, Quaternion, Ray, Vec3 } from "cannon";
import { Client } from "colyseus";
import { pad } from "lodash";
import { c } from "../../c";
import { BoxModel, IBox } from "../../db/DataBaseSchemas";
import { WBox } from "../../db/WorldInterfaces";
import { SWorker } from "../../rooms/Worker";
import { BoxObject, ObjectMessage, ObjectState, Quat, V3 } from "../../schema/GameRoomState";
import { SObject } from "../SObject";
import { MWorld } from "../world";
import { GolfBall } from "./GolfBall";


export class Player extends SObject {
    padding = { x: 0, y: -2, z: 0 };
    size: { x: number, y: number, z: number };

    hasSetBall = false;

    followerObject: SObject;

    padVelocity: { x: number, y: number } = { x: 0, y: 0 }
    ball: GolfBall;
    wasOnZero: boolean = false;

    friction = .93;
    power = 0;
    maxPower: number = 4;
    powerForce: number = .3;

    initialMoveVel = .8;
    moveVelocity = 0;
    camRot = { x: 0, y: 0 };
    distance: number = 0;

    initialPropultion =.08;
    propultion =.01;
    maxPropultion = 0.3;
    propultionVelocity = 0;

    goingUp = true;




    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, world: MWorld) {
        super(bodyState, body, client, world);

        var worker = new SWorker(this.world.room)

        worker.setTimeout(() => { this.initObjects() }, 10);

        new SWorker(this.room).setInterval(() => {
            this.tick();
        }, 1);

        this.body.collisionResponse = false;
        this.ball = this.room.users.get(this.client.sessionId).golfball;
    }

    rotate(quat: Quat) {
        this.body.quaternion.x = quat.x;
        this.body.quaternion.y = quat.y;
        this.body.quaternion.z = quat.z;
        this.body.quaternion.w = quat.w;
    }


    move(x: number, y: number, rotX: number, rotZ: number) {

        var rad1 = Math.atan2(y, x);
        var rad2 = Math.atan2(rotZ, rotX);

        var gr = (rad1 + rad2);

        var xT = Math.cos(gr);
        var yT = Math.sin(gr);

        this.padVelocity.x = Math.abs(x / 100);
        this.padVelocity.y = Math.abs(y / 100);

        this.distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / 100


        this.moveVelocity = (this.initialMoveVel * this.distance) + this.power;


        this.camRot.x = -(xT);
        this.camRot.y = yT;

        if (x == 0 && y == 0) {
            this.camRot.x = 0;
            this.camRot.y = 0;
        }
    }
    isStatic(): boolean {
        var maxvel = 0.001;
        var xv = this.body.velocity.x < maxvel && this.body.velocity.x > -maxvel;
        var yv = this.body.velocity.y < maxvel && this.body.velocity.y > -maxvel;
        return xv && yv;
    }

    tick() {
        if (this.power > this.maxPower) {
            this.power = this.maxPower;
        }

        if (this.padVelocity.x != 0 || this.padVelocity.y != 0) {
            this.power += this.powerForce*(this.distance*.5);
        } else {
            this.power *= this.friction;
        }

        if(this.goingUp){
            this.propultionVelocity+=this.propultion;
        }else{
            this.propultionVelocity-=this.propultion;
        }

        if(Math.abs(this.propultionVelocity) > this.maxPropultion){
            this.goingUp=!this.goingUp;
        }
        


        this.body.velocity.x += (this.camRot.y * (this.moveVelocity + this.power));
        this.body.velocity.z += (this.camRot.x * (this.moveVelocity + this.power));
        this.body.velocity.y += this.propultionVelocity;

        this.body.velocity.x *= this.friction;
        this.body.velocity.z *= this.friction;
        this.body.velocity.y *= this.friction;

        if (this.isStatic() && this.padVelocity.x == 0 && this.padVelocity.y == 0) {
            this.power = 0;
        }

    }
    initObjects() {
        var pos = this.room.world.ballSpawn;
        this.setPosition(pos.x + this.padding.x, pos.y + this.padding.y, pos.z + this.padding.z);
    }

    triggerShooting(){
        var m = new ObjectMessage();
        m.uID = this.uID;
        m.message = "trigger_ShootAnim";
        this.sendMessage(m);
    }
   /* onMessage(m:ObjectMessage){
        //Riesgo de seguridad, cualquiera podra modificar las animaciones de las demas personas.
        if(m.message == "start_Shoot"){
            this.sendMessage(m);
        }
    }*/
}