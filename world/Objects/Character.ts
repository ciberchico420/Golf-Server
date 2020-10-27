import { Constraint, PointToPointConstraint, Quaternion, Ray, Vec3 } from "cannon";
import { Client } from "colyseus";
import { pad } from "lodash";
import { c } from "../../c";
import { BoxModel, IBox } from "../../db/DataBaseSchemas";
import { WBox } from "../../db/WorldInterfaces";
import { SWorker } from "../../rooms/Worker";
import { BoxObject, ObjectState, Quat, V3 } from "../../schema/GameRoomState";
import { SObject } from "../SObject";
import { MWorld } from "../world";
import { GolfBall } from "./GolfBall";


export class Character extends SObject {
    padding = { x: 0, y: 40, z: 0 };
    size: { x: number, y: number, z: number };

    hasSetBall = false;

    followerObject: SObject;

    velocity: { x: number, y: number } = { x: 0, y: 0 }
    ball: GolfBall;
    wasOnZero: boolean = false;



    constructor(bodyState: ObjectState, body: CANNON.Body, client: Client, world: MWorld) {
        super(bodyState, body, client, world);

        var worker = new SWorker(this.world.room)


        worker.setTimeout(() => { this.initObjects() }, 10);

        new SWorker(this.room).setInterval(() => {
            this.tick();
        }, 1);



        this.createFollowerObject();

        /*this.setPosition(0,180,0);
        this.followerObject.setPosition(0,170,0);*/


        this.setConstrains();

        this.ball = this.room.users.get(this.client.sessionId).golfball;





    }

    getAngle(): number {

        var b: { x: number, y: number } = { x: this.objectState.position.x, y: this.objectState.position.z }
        var a: { x: number, y: number } = { x: this.ball.objectState.position.x, y: this.ball.objectState.position.z }
        var difx = a.x - b.x;
        var dify = a.y - b.y;
        var angle = Math.atan2(difx, dify) * 360 / Math.PI;

        var lookup = Math.round(angle)
        return lookup / 100;

    }
    isOnZeroY() {
        return Math.round(this.body.position.z) - Math.round(this.ball.body.position.z) == 0
    }
    isOnZeroX() {
        return Math.round(this.body.position.x) - Math.round(this.ball.body.position.x) == 0
    }
    tick() {
        var vel = 0.6;
        var angle = this.getAngle();

        var rotation = new Vec3();
        this.body.quaternion.toEuler(rotation);

        this.setRotation(0, angle, 0);


        var vector = { x: 0, y: 0 };


        var disY = Math.round(this.body.position.z) - Math.round(this.ball.body.position.z);
        var disX = Math.round(this.body.position.x) - Math.round(this.ball.body.position.x);
        if (disY < 0) {
            vector.y = vel;
        } else {

            vector.y = -vel;
        }

        if (disX < 0) {
            vector.x = vel;
        } else {

            vector.x = -vel;
        }


        if (this.isOnZeroX()) {
            vector.x = 0;
        }


        if (this.isOnZeroY()) {
            vector.y = 0;
        }
        if(this.isOnZeroX() && this.isOnZeroY()) {
            this.wasOnZero = true;
        }
        if(this.isOnZeroX() && this.isOnZeroY() && this.wasOnZero){
            this.stopPlatform(angle);
           // this.wasOnZero = true;
        }else{
            this.wasOnZero = false;
        }
     
        

        this.body.position.x += vector.x;
        this.body.position.z += vector.y;

    }
    setConstrains() {
        var distance = 20;
       /* this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(2, 2, 0), this.followerObject.body, new Vec3(this.size.x, distance, 0)));
        this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(-2, 2, 0), this.followerObject.body, new Vec3(-this.size.x, distance, 0)));*/

         //this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(0, 2, 2), this.followerObject.body, new Vec3(0, distance, this.size.z)));
         //this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(0, 2, -2), this.followerObject.body, new Vec3(0, distance, -this.size.z)));

        this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(0, 0, 0), this.followerObject.body, new Vec3(0, distance, 0)));

        //this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(0, 2, 2), this.followerObject.body, new Vec3(0, distance, this.size.z)));
        //this.world.cworld.addConstraint(new PointToPointConstraint(this.body, new Vec3(0, 2, -2), this.followerObject.body, new Vec3(0, distance, -this.size.z)));


    }
    createFollowerObject() {
        var box: WBox = new WBox()
        box.halfSize = c.createV3(10, 3, 15);
        box.instantiate = true;
        box.quat = c.initializedQuat();
        box.mass = 1;

        this.followerObject = this.room.world.createBox(box, this.client);
        //this.followerObject.body.collisionResponse = false;

        this.size = box.halfSize;
    }
    initObjects() {
        var ball: GolfBall = this.room.users.get(this.client.sessionId).golfball;
        var pos = ball.getPosition();
        this.setPosition(pos.x + this.padding.x, pos.y + this.padding.y, pos.z + this.padding.z);
        this.followerObject.setPosition(pos.x + this.padding.x, pos.y + this.padding.y - 10, pos.z + this.padding.z);
    }

    stopPlatform(angle:number){
        this.followerObject.body.velocity = new Vec3(0, 0, 0);
        this.followerObject.body.angularVelocity = new Vec3(0, 0, 0);
        this.followerObject.body.angularDamping = 0;
        this.followerObject.body.angularVelocity =  new Vec3(0, 0, 0);
        this.followerObject.body.quaternion = new Quaternion(0,0,0,1);
    }


}