import { Client } from "colyseus"
import { ObjectState } from "../../schema/GameRoomState"
import { WObject } from "../WObject"
import { WorldInstance } from "../WorldsManager"
import { WorldRunner } from "../WorldRunner";
import { SWorld } from "../world2";

export class Player2 extends WObject {
    padding = { x: 0, y: -2, z: 0 };

    hasSetBall = false;


    padVelocity = { x: 0, y: 0 }
    //ball: GolfBall;
    wasOnZero: boolean = false;


    maxPower: number = 4;
    powerForce: number = .3;
    friction = .93;


    power = 0;


    initialMoveVel = .8;
    moveVelocity = 0;
    camRot = { x: 0, y: 0 };
    distance: number = 0;

    initialPropultion = .08;
    propultion = .01;
    maxPropultion = 0.3;

    propultionVelocity = 0;

    goingUp = true;

    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        var w = new WorldRunner(world);
        w.setInterval(() => this.tick(), 10);
    }

    tick() {

        if (this.power > this.maxPower) {
            this.power = this.maxPower;
        }

        if (this.padVelocity.x != 0 || this.padVelocity.y != 0) {
            this.power += this.powerForce * (this.distance * .5);
        } else {
            this.power *= this.friction;
        }


        if (this.goingUp) {
            this.propultionVelocity += this.propultion;
        } else {
            this.propultionVelocity -= this.propultion;
        }

        if (Math.abs(this.propultionVelocity) > this.maxPropultion) {
            this.goingUp = !this.goingUp;
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

        this.needUpdate = true;
    }
    isStatic(): boolean {
        var maxvel = 0.001;
        var xv = this.body.velocity.x < maxvel && this.body.velocity.x > -maxvel;
        var yv = this.body.velocity.y < maxvel && this.body.velocity.y > -maxvel;
        return xv && yv;
    }


}