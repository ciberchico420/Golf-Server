import { Client } from "colyseus"
import { EulerQuat, ObjectMessage, ObjectState, Quat, ShotMessage, SphereObject, UserState, V3 } from "../../schema/GameRoomState"
import { WObject } from "./WObject"
import { WorldInstance } from "../WorldsManager"
import { WorldRunner } from "../WorldRunner";
import { SWorld, WorldRoom, WorldUser } from "../world2";
import { c } from "../../c";
import { MessageToOwner, WIBox, WISphere } from "../../db/WorldInterfaces";
import { DistanceConstraint, LockConstraint, PointToPointConstraint, Quaternion, Ray, Vec3 } from "cannon";
import { max } from "lodash";
import { GolfBall2 } from "./GolfBall2";
import e from "express";
import { Power2 } from "./Powers/Power2";
import { GenericFireBall } from "./Powers/GenericFireBall";

export class Player2 extends WObject {

    hasSetBall = false;


    padVelocity = { x: 0, y: 0 }
    wasOnZero: boolean = false;

    initialMoveVel = .8;
    moveVelocity = 0;
    camRot = { x: 0, y: 0 };
    distance: number = 0;

    spawnPoint: V3;
    golfBall: GolfBall2;

    ray: Ray = new Ray();
    isJumping: boolean = false;
    canShoot: boolean = false;
    maxDistanceWithBall: number = 10;
    isShooting: boolean = false;
    isMoving: boolean = false;
    room: WorldRoom;

    user: WorldUser;
    hitBox: WObject;
    hitBoxRotation: EulerQuat = new EulerQuat();
    hitBoxRadius: number = 0;


    playerSize = c.createV3(10, 22, 10);
    maxEnergy: number = 400;
    energy: number = this.maxEnergy;

    defense: number = 30;
    attack: number = 55;
    lastGasoline: number = -333;
    jumpForce: number = 25;
    private sendMessageSnapped: boolean = false;
    forceMultiplier: number = 80;
    movePower: number = 4;

    afterShootListeners: Array<() => any> = Array();
    afterJumpListeners: Array<() => any> = Array();

    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        var w = new WorldRunner(world);
        w.setInterval(() => this.tick(), 1);
        // this.body.collisionResponse = false;
        this.spawnPoint = c.createV3(world.spawnPoint.x, world.spawnPoint.y, world.spawnPoint.z);
        this.ignoreRotation = true;

        this.hitBoxRotation.euler = c.initializedV3();
        this.hitBoxRotation.quat = c.initializedQuat();


        this.body.linearDamping = .01;
        this.body.angularDamping = .6;

        this.body.addEventListener("collide", (o: any) => {
            var obj = world.getWObjectByBodyID(o.body.id);
            if (obj.objectState.type == "fallArea") {
                new WorldRunner(this.world).setTimeout(() => {
                    this.stop();
                    this.setPositionToBall();
                }, 200)

            }
            this.isJumping = false;
        })
    }
    firstTick() {
        this.setRotation(0, 90, 0);
        this.setPositionToSpawnPoint();
        this.room = this.world.getWorldRoom(this.roomID);
        this.createUser();
        this.createHitBox();
        this.sendEnergy();
        this.setHitBoxEulerFromParentQuat(c.getEulerQuat());

    }
    receiveDamage(dmg: number) {
        this.energy -= dmg;
        this.sendEnergy();
    }
    private sendEnergy() {
        this.room.setState("users." + this.user.sessionId, "energy", this.energy);
    }
    createHitBox() {
        var box: WIBox = new WIBox();
        box.halfSize = this.playerSize;
        box.type = "hitBox";
        box.mass = 0;
        box.instantiate = false;
        this.hitBox = this.room.createObject(box, this.user.sessionId);
        this.hitBox.body.collisionResponse = false;
    }
    onHitBoxCollide(e: any) {
        this.stop();
    }
    stop() {
        super.stop();
        this.moveVelocity = 0;
    }
    createUser() {
        var wU = new WorldUser(this.world, this.objectState.owner.sessionId, this.room);
        this.room.users.set(wU.sessionId, wU);
        this.user = wU;
        this.user.player = this;
    }
    setPositionToSpawnPoint() {
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
    }

    move(x: number, y: number) {
        this.padVelocity.x = x;
        this.padVelocity.y = y;
        this.distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / 100 //Del Dpad

        if (x != 0 || y != 0) {
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }

        this.setAnimationToNotSnapped();
    }
    jump(isJumping: boolean) {
        if (!this.isJumping) {
            //this.stop()
            this.body.quaternion = c.Quaternion;
            this.body.applyImpulse(new Vec3(0, this.jumpForce, 0), this.body.position)
            this.isJumping = true;
            this.triggerAfterJump()
        }
    }
    tick() {
        this.checkIfFall();
        this.checkDistanceWithBall();
        this.setHitBoxRotation();
        this.tickMoveAndJump();

    }
    checkIfFall() {
        if(this.body != undefined){
            if (this.body.position.y < -50) {
            this.setPositionToBall()
        } 
        }
       
    }
    rotateAroundPoint(radius: number, center: Vec3, angle: number) {
        angle = (angle) * (Math.PI / 180); // Convert to radians
        var x = center.x + radius * Math.cos(angle)
        var y = center.z + radius * Math.sin(angle)
        return new Vec3(x, y);
    }
    setHitBoxEulerFromParentQuat(quat: EulerQuat) {
        this.hitBoxRotation = quat;
    }
    private bodyEuler = new Vec3();
    private setHitBoxRotation() {
        if (this.body != undefined && this.hitBox != undefined) {
            this.body.quaternion.toEuler(this.bodyEuler);
            var v3 = this.rotateAroundPoint(this.hitBoxRadius, this.body.position, -(this.hitBoxRotation.euler.y + 82))

            this.hitBox.setPosition(v3.x, this.body.position.y + 28, v3.y);
            this.hitBox.body.quaternion = new Quaternion(this.hitBoxRotation.quat.x, this.hitBoxRotation.quat.y, this.hitBoxRotation.quat.z, this.hitBoxRotation.quat.w);
        }
    }


    canSnap() {
        if (this.isShooting || this.isMoving || this.isJumping) {
            return false;
        } else {
            return true;
        }
    }
    distanceWithBall() {
        return Math.abs(Math.sqrt(Math.pow(this.golfBall.body.position.x - this.body.position.x, 2) + Math.pow(this.golfBall.body.position.y - this.body.position.y, 2) + Math.pow(this.golfBall.body.position.z - this.body.position.z, 2)));
    }
    private checkDistanceWithBall() {

        if (this.golfBall != undefined) {
            var distance = this.distanceWithBall();
            if (distance < this.maxDistanceWithBall) {
                this.canShoot = true;
                if (this.canSnap()) {
                    this.golfBall.stop();
                    this.stop();
                    this.setPositionToBall();
                    this.setAnimationToSnapped();
                    this.sendMessageSnapped = true;
                    // this.changeCollitionResponse(false);

                }

            } else {
                this.canShoot = false;
            }
            //console.log("Distance", distance);
        }
    }
    setPositionToBall() {
        this.setPosition(this.golfBall.body.position.x, this.golfBall.body.position.y + (this.golfBall.radius * 2) + (this.objectState as SphereObject).radius, this.golfBall.body.position.z);
    }
    private tickMoveAndJump() {
        if (this.isMoving) {

            var radPad = Math.atan2(this.padVelocity.x, this.padVelocity.y);
            var radian = (this.hitBoxRotation.euler.y) * (Math.PI / 180);
            var x = Math.cos(radian + radPad)
            var y = Math.sin(radian + radPad)

            this.needUpdate = true;
            var asd = -(this.movePower * x);
            var asdy = (this.movePower * y);
            this.body.applyForce(new Vec3(asd, 0, asdy), this.body.position)
        }

    }

    raycastTest() {
        /* this.ray.from = this.body.position;
       this.padd.x = this.body.position.x;
       this.padd.y = this.body.position.y-15;
       this.padd.z = this.body.position.z;
       this.ray.to = this.padd;

       var hit = this.ray.intersectWorld(this.world.cworld,{mode:2});


       if(this.ray.result.distance < 6){
           this.floatOverVelocity =.4;
       }else{
           this.floatOverVelocity = 0;
       }
       if(!hit){
           this.floatOverVelocity =-.4;
       }*/
    }
    private triggerAfterShoot() {
        this.triggerEvents(this.afterShootListeners);
        
    }
    private triggerAfterJump() {
        this.triggerEvents(this.afterJumpListeners);

        console.log(this.afterJumpListeners.length)
    }
    private triggerEvents(list: Array<() => any>) {
        list.forEach(val => {
            val();
            val = undefined;
        })
        list.splice(0,list.length);

    }
    shootBall(message: ShotMessage) {
        if (this.canShoot) {
            this.changeCollitionResponse(true);
            this.triggerShooting();
            new WorldRunner(this.world).setTimeout(() => {

                this.golfBall.body.quaternion = new Quaternion(message.angle.x, message.angle.y, message.angle.z, message.angle.w);

                this.isShooting = true;


                this.golfBall.body.applyLocalImpulse(new Vec3(
                    0,
                    0,
                    (message.force * this.forceMultiplier)
                ), new Vec3(0, 0, 0));
                this.golfBall.spawnPoint.x = this.golfBall.objectState.position.x;
                this.golfBall.spawnPoint.y = this.golfBall.objectState.position.y;
                this.golfBall.spawnPoint.z = this.golfBall.objectState.position.z;

                new WorldRunner(this.world).setTimeout(() => {
                    this.isShooting = false;
                    this.setAnimationToNotSnapped();
                }, AnimationTimes.shoot_Anim_End);
            }, AnimationTimes.shootBall)

            this.triggerAfterShoot();

        } else {
            var messagew: MessageToOwner = new MessageToOwner();
            messagew.uID = this.uID;
            messagew.room = this.roomID;
            messagew.message = "Get closer to your ball!";
            this.world.sendMessageToParent("messageToOwner", messagew);
        }


    }
    use_Power1() {
        var ball = GenericFireBall.createWIObject();
        var power = this.room.createObject(ball, this.objectState.owner.sessionId) as Power2;
    }

    setAnimationToSnapped() {

        if (!this.sendMessageSnapped) {
            var m = new ObjectMessage();
            m.uID = this.uID;
            m.message = "Snap_true";
            m.room = this.roomID;
            this.sendMessage(m);
        }

        this.hitBoxRadius = 25;
    }
    setAnimationToNotSnapped() {
        var m = new ObjectMessage();
        m.uID = this.uID;
        m.message = "Snap_false";
        m.room = this.roomID;
        this.sendMessage(m);
        this.hitBoxRadius = 0;
        this.sendMessageSnapped = false;
        this.changeCollitionResponse(true);

    }

    triggerShooting() {
        var m = new ObjectMessage();
        m.uID = this.uID;
        m.message = "trigger_ShootAnim";
        m.room = this.roomID;
        this.sendMessage(m);
    }


}

class AnimationTimes {
    static shootBall: number = 435;
    static stopBall: number = 25;
    static shoot_Anim_End = 1430;
}