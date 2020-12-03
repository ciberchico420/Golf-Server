import { Client } from "colyseus"
import { EulerQuat, ObjectMessage, ObjectState, Quat, ShotMessage, UserState, V3 } from "../../schema/GameRoomState"
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
    //ball: GolfBall;
    wasOnZero: boolean = false;


    maxPower: number = 1;
    powerForce: number = .03;
    friction = .93;


    power = 0;


    initialMoveVel = .8;
    moveVelocity = 0;
    camRot = { x: 0, y: 0 };
    distance: number = 0;

    initialPropultion = 3.5;
    propultion = .004;
    maxPropultion = 2;
    jumpingPhase = 0;

    propultionVelocity = 0;
    maxGasoline = 200;
    gasoline = this.maxGasoline;
    gasolineCost: number = 1;

    jumpingFriction = .1;


    spawnPoint: V3;
    golfBall: GolfBall2;

    ray: Ray = new Ray();
    isJumping: boolean = false;
    canShoot: boolean = false;
    maxDistanceWithBall: number = 20;
    isShooting: boolean = false;
    isMoving: boolean = false;
    room: WorldRoom;

    user: WorldUser;
    hitBox: WObject;
    hitBoxRotation: EulerQuat = new EulerQuat();
    hitBoxRadius: number = 0;

    powers:Array<Power2> = new Array(3);

    playerSize = c.createV3(10, 22, 10);

    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        var w = new WorldRunner(world);
        w.setInterval(() => this.tick(), 10);
        // this.body.collisionResponse = false;
        this.spawnPoint = c.createV3(world.spawnPoint.x, world.spawnPoint.y, world.spawnPoint.z);
        this.ignoreRotation = true;

        this.hitBoxRotation.euler = c.initializedV3();
        this.hitBoxRotation.quat = c.initializedQuat();


        //this.body.linearDamping = .01;
        // this.body.angularDamping = .6;

        this.body.addEventListener("collide", (o: any) => {
            if (!this.isJumping) {
                this.jumpingPhase = 0;
                this.propultionVelocity = 0;
            }
        })
    }
    firstTick() {
        this.setRotation(0, 90, 0);
        this.setPositionToSpawnPoint();
        this.room = this.world.getWorldRoom(this.roomID);
        this.createUser();
        this.createHitBox();
    }
    createHitBox() {
        var box: WIBox = new WIBox();
        box.halfSize = this.playerSize;
        box.type = "hitBox";
        box.mass = 0;
        box.instantiate = true;
        this.hitBox = this.room.createObject(box, this.user.sessionId);
        this.hitBox.body.collisionResponse = false;

       /* this.hitBox.body.addEventListener("collide",(e:any)=>{
            this.onHitBoxCollide(e);
        })*/
        /*var constrain;
        this.world.cworld.addConstraint(constrain =new LockConstraint(this.body,this.hitBox.body));*/
    }
    onHitBoxCollide(e:any) {
       this.stop();
    }
    stop(){
        super.stop();
        this.moveVelocity = 0;
        this.power = 0;
        this.jumpingPhase = 0;
    }
    createUser() {
        var wU = new WorldUser(this.world, this.objectState.owner.sessionId, this.room);
        this.room.users.set(wU.sessionId, wU);

        this.user = wU;
        this.user.player =this;
    }


    setPositionToSpawnPoint() {
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
    }
    public direction:Vec3 = new Vec3();
    move(x: number, y: number, rotX: number, rotZ: number) {

        var rad1 = Math.atan2(y, x);
        var rad2 = Math.atan2(rotZ, rotX);

        var gr = (rad1 + rad2);

        var xT = Math.cos(gr);
        var yT = Math.sin(gr);
        this.direction.x = xT;
        this.direction.z = yT;

        this.padVelocity.x = Math.abs(x / 100);
        this.padVelocity.y = Math.abs(y / 100);

        this.distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / 100

        this.moveVelocity = (this.initialMoveVel * this.distance) + this.power;



        this.camRot.x = -(xT);
        this.camRot.y = yT;
        this.isMoving = true;

        if (x == 0 && y == 0) {
            this.camRot.x = 0;
            this.camRot.y = 0;
            this.isMoving = false;
        }
        this.setAnimationToNotSnapped();
    }
    jump(isJumping: boolean) {
        this.isJumping = isJumping
        if (isJumping && this.gasoline > 0) {
            this.gasoline -= this.gasolineCost;
            if (this.jumpingPhase == 1) {
                this.jumpingPhase = 2;
            }
            if (this.jumpingPhase == 0) {
                this.propultionVelocity = this.initialPropultion;
                this.jumpingPhase = 1;
            }

            this.propultionVelocity += this.propultion;
        }
        if (!isJumping) {
            this.jumpingPhase = 0;
            this.propultionVelocity = 0;
        }

    }


    tick() {
        
        this.tickMoveAndJump();

        this.checkDistanceWithBall();
        this.sendGasoline()
        this.setHitBoxRotation();
  
    }
    rotateAroundPoint(radius: number, center: Vec3, angle: number) {
        angle = (angle) * (Math.PI / 180); // Convert to radians
        var x = center.x + radius * Math.cos(angle)
        var y = center.z + radius * Math.sin(angle)
        //var rotatedX = Math.cos(angle) * (point.x - center.x) - Math.sin(angle) * (point.z - center.z);
        //var rotatedY = Math.sin(angle) * (point.x - center.x) + Math.cos(angle) * (point.z - center.z);
        return new Vec3(x, y);
    }
    setHitBoxEulerFromParentQuat(quat:EulerQuat){
        this.hitBoxRotation = quat;
    }
    private bodyEuler = new Vec3();
    private setHitBoxRotation() {

        this.body.quaternion.toEuler(this.bodyEuler);
        var v3 = this.rotateAroundPoint(this.hitBoxRadius, this.body.position, -(this.hitBoxRotation.euler.y+82))

        this.hitBox.setPosition(v3.x, this.body.position.y + 28, v3.y);
       

        this.hitBox.body.quaternion = new Quaternion(this.hitBoxRotation.quat.x,this.hitBoxRotation.quat.y,this.hitBoxRotation.quat.z,this.hitBoxRotation.quat.w);
        

    }
    private sendGasoline() {
        if (this.gasoline < 200)
            this.room.setState("users." + this.user.sessionId, "gasoline", this.gasoline);
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
        var distance = this.distanceWithBall();
        if (this.golfBall != undefined) {

            if (distance < this.maxDistanceWithBall) {
                this.canShoot = true;
                if (this.canSnap()) {
                    this.golfBall.stop();
                    this.stop();
                    this.setPositionToBall();
                    this.setAnimationToSnapped();

                }

            } else {
                this.canShoot = false;
            }
            //console.log("Distance", distance);
        }
    }
    setPositionToBall() {
        this.setPosition(this.golfBall.body.position.x, this.golfBall.body.position.y + (this.golfBall.radius * 2), this.golfBall.body.position.z);
    }
    private tickMoveAndJump() {
        if (this.body.position.y < -50.5) {
            this.setPositionToSpawnPoint();
        }
        if (this.power > this.maxPower) {
            this.power = this.maxPower;
        }

        if (this.padVelocity.x != 0 || this.padVelocity.y != 0) {
            this.power += this.powerForce * (this.distance * .5);
        } else {
            this.power *= this.friction;
        }

        if (this.gasoline <= 0) {
            this.propultionVelocity = 0;
        }

        if (!this.isJumping) {
            if (this.gasoline < this.maxGasoline && this.body.velocity.y < 0.004) {
                this.gasoline += .6;
            }
            this.propultionVelocity = 0//this.jumpingFriction;
        }



        this.body.velocity.x += (this.camRot.y * (this.moveVelocity + this.power));
        this.body.velocity.z += (this.camRot.x * (this.moveVelocity + this.power));
        this.body.velocity.y += this.propultionVelocity;
        if (this.isJumping) {
          /*  var lent = 0.99;
            this.body.velocity.x *= lent;
            this.body.velocity.z *= lent;*/
        }

        if (this.isStatic() && this.padVelocity.x == 0 && this.padVelocity.y == 0) {
            this.power = 0;
        }
        this.needUpdate = true;
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

    shootBall(message: ShotMessage) {
        if (this.canShoot) {
            var forceMultiplier = 80;
            this.triggerShooting();
            new WorldRunner(this.world).setTimeout(() => {

                this.golfBall.body.quaternion = new Quaternion(message.angle.x, message.angle.y, message.angle.z, message.angle.w);

                this.isShooting = true;
                

                this.golfBall.body.applyLocalImpulse(new Vec3(
                    0,
                    0,
                    (message.force * forceMultiplier)
                ), new Vec3(0, 0, 0));
                this.golfBall.spawnPoint.x = this.golfBall.objectState.position.x;
                this.golfBall.spawnPoint.y = this.golfBall.objectState.position.y;
                this.golfBall.spawnPoint.z = this.golfBall.objectState.position.z;

                new WorldRunner(this.world).setTimeout(() => {
                    this.isShooting = false;
                    this.setAnimationToNotSnapped();
                }, AnimationTimes.shoot_Anim_End);
            }, AnimationTimes.shootBall)

        } else {
            var messagew: MessageToOwner = new MessageToOwner();
            messagew.uID = this.uID;
            messagew.room = this.roomID;
            messagew.message = "Get closer to your ball!";
            this.world.sendMessageToParent("messageToOwner", messagew);
        }


    }
    use_Power1(){
        var ball = GenericFireBall.createWIObject();
        console.log(this.objectState.owner.sessionId)
        var power =this.room.createObject(ball,this.objectState.owner.sessionId) as Power2;
    }

    setAnimationToSnapped() {
        var m = new ObjectMessage();
        m.uID = this.uID;
        m.message = "Snap_true";
        m.room = this.roomID;
        this.sendMessage(m);
        this.hitBoxRadius = 25;
    }
    setAnimationToNotSnapped() {
        var m = new ObjectMessage();
        m.uID = this.uID;
        m.message = "Snap_false";
        m.room = this.roomID;
        this.sendMessage(m);
        this.hitBoxRadius = 0;
       
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