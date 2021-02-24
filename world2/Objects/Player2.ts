import { Client } from "colyseus"
import { ObjectMessage, ObjectState, Quat, ShotMessage, SphereObject, UserState, V3 } from "../../schema/GameRoomState"
import { WObject } from "./WObject"
import { WorldInstance } from "../WorldsManager"
import { WorldRunner } from "../WorldRunner";
import { SWorld } from "../world2";
import { c } from "../../c";
import { MessageToOwner, WIBox, WIObject, WISphere } from "../../db/WorldInterfaces";
import { DistanceConstraint, LockConstraint, PointToPointConstraint, Quaternion, Ray, Vec3 } from "cannon";
import { max, template } from "lodash";
import { GolfBall2 } from "./GolfBall2";
import e from "express";
import { Power2 } from "./Powers/Power2";
import { GenericFireBall } from "./Powers/GenericFireBall";
import { WorldUser } from "../WorldUser";
import { WorldRoom } from "../WorldRoom";
import { Agent, AgentState } from "../../AI/Agent";
import { BoardObject } from "./Planning/BoardObject";
import { AIBoardObject } from "./Planning/AIBoardObject";

export class Player2 extends WObject {
    private padVelocity = { x: 0, y: 0 }
    distanceMove: number = 0;

    spawnPoint: V3;
    golfBall: GolfBall2;

    ray: Ray = new Ray();
    isJumping: boolean = false;
    canShoot: boolean = false;
    maxDistanceWithBall: number = 50;
    isShooting: boolean = false;
    isMoving: boolean = false;
    room: WorldRoom;

    user: WorldUser;
    hitBox: WObject;
    hitBoxRadius: number = 0;

    playerSize = c.createV3(10, 22, 10);

    defense: number = 30;
    attack: number = 55;
    maxEnergy: number = 100;

    jumpForce: number = 150;
    shootForceMultiplier: number = 80;
    movePower: number = .4;

    afterShootListeners: Array<() => any> = Array();
    afterJumpListeners: Array<() => any> = Array();
    isDeath: boolean = false;
    rotationDelta: { x: number; y: number; } = { x: 0, y: 0 };
    positionIndex: number = 0;

    /**This variables controls the speed of the movement */
    private acceleration: number = 0;
    private maxAcceleration: number = 4;
    private accelerationPower: number = .008;

    //This vector controlls the rotation of the character included the hitbox
    private setterEuler: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }

    public Agent: Agent;


    constructor(bodyState: WIObject, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        this.Agent = new Agent(this);
        this.registerAgents();
        this.addInterval("Player tick interval", this.tick.bind(this), 1);

        this.ignoreRotation = true;

        this.body.angularDamping = .9;

        this.body.addEventListener("collide", (o: any) => {
            var obj = world.getWObjectByBodyID(o.body.id);
            if (obj != undefined) {
                if (obj.objectState.type == "fallArea") {
                    this.addTimeOut("Player 2 FallArea runner", () => {
                        this.stop();
                        this.setPositionToBall();
                    }, 200)

                }
                this.isJumping = false;
            }

        })
    }
    registerAgents() {
        this.Agent.register("Snapped", new Snapped_AS(this.Agent));
        this.Agent.register("NotSnapped", new NotSnapped_AS(this.Agent));
        this.Agent.register("triggerShooting", new TriggerShooting_AS(this.Agent));
        this.Agent.register("Hello", new Hello_AS(this.Agent));
    }
    afterBallFall() {
        this.setPositionToBall();
        return true;
    }
    setGolfBall(golfBall: GolfBall2) {
        //console.log("Golfball connected")
        this.golfBall = golfBall;
        golfBall.afterFallListeners.push(this.afterBallFall.bind(this));
    }
    firstTick() {
        this.setRotation(0, 90, 0);

        this.room = this.world.getWorldRoom(this.roomID);
        this.setUser();
        this.createHitBox();
        this.instantiate()

        this.amI_IA()

    }
    setUser() {
        this.user = this.room.users.get(this.objectState.owner.sessionId);
        this.user.player = this;

        this.setStartPosition();
    }
    amI_IA() {
        if (this.objectState.owner.sessionId.includes("fake/")) {
            //  this.AI_Tree = new FakePlayerTree(this);
        }
    }
    instantiate() {
        this.user.state.energy = this.maxEnergy;
        this.user.update();
    }
    getStartPosition() {

        if (this.positionIndex >= this.world.map.startPositions.length) {
            this.positionIndex = 0;
        }
        var startPosition = this.world.map.startPositions[this.positionIndex];
        return startPosition;
    }
    setStartPosition() {
        this.positionIndex = this.room.users.size - 1;

        var startPosition = this.getStartPosition();
        this.spawnPoint = c.createV3(startPosition.x, startPosition.y, startPosition.z);
        this.addTimeOut("SetStartPosition Runner", () => {
            this.setterEuler.y = -180;
            this.setCameraRotation();
            this.Agent.changeState("Hello");
        }, 200)
    }
    receiveDamage(dmg: number) {
        this.user.state.energy -= dmg;
        this.user.update();
    }
    addEnergy(eng: number) {
        this.user.state.energy += eng;
        this.user.update();
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
    }

    setPositionToSpawnPoint() {
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
    }

    move(x: number, y: number) {
        this.padVelocity.x = x;
        this.padVelocity.y = y;
        this.distanceMove = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / 100 //Del Dpad
        let minPo = 15;
        if (Math.abs(x) < minPo && Math.abs(y) < minPo) {
            x = 0;
            y = 0;
        }

        if (x != 0 || y != 0) {
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
        this.Agent.changeState("NotSnapped");

    }
    jump() {
        if (!this.isJumping) {
            //this.stop()
            this.body.quaternion = c.Quaternion;
            this.body.applyImpulse(new Vec3(0, this.jumpForce, 0), this.body.position)
            this.isJumping = true;
            this.triggerAfterJump()

        }
    }
    tick() {

        /*if (this.AI_Tree != undefined) {
          //  this.AI_Tree.tick();
        }*/
        if (!this.isDeath && this.user != undefined) {
            this.checkIfFall();
            this.checkDistanceWithBall();
            this.tickRotation();
            this.tickMoveAndJump();
            this.tickDeath();
            this.setCameraRotation();
        }
        this.Agent.tick();
    }
    checkIfFall() {
        if (this.body != undefined) {
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

    private tickRotation() {
        if (this.body != undefined && this.hitBox != undefined) {
            var xVelocity = this.rotationDelta.x * 0.3;
            if (this.rotationDelta.x != 0) {
                this.setterEuler.y -= xVelocity;
            }
        }
    }

    setCameraRotation() {
        if (this.setterEuler.y > 360) {
            this.setterEuler.y = 0;
        }
        this.setRotation(0, this.setterEuler.y, 0)
        this.setHitboxPosition()
    }
    setHitboxPosition() {
        var v3 = this.rotateAroundPoint(this.hitBoxRadius, this.body.position, -(this.setterEuler.y + 82))
        this.hitBox.setPosition(v3.x, this.body.position.y + 28, v3.y);
        this.hitBox.setRotation(0, this.setterEuler.y, 0);
    }
    getSetterEuler() {
        return this.setterEuler;
    }
    setSetterEuler(x: number, y: number, z: number) {
        this.setterEuler.x = x;
        this.setterEuler.y = y;
        this.setterEuler.z = z;
        this.setCameraRotation();
    }


    rotatePlayer(delta: { x: number, y: number }) {
        if (this.body != undefined && this.hitBox != undefined) {
            this.rotationDelta = delta;
        }
    }

    canSnap() {
        if (this.isShooting || this.isMoving || this.isJumping) {
            return false;
        } else {
            return true;
        }
    }
    distanceWithBall(): number {
        return Math.abs(Math.sqrt(Math.pow(this.golfBall.body.position.x - this.body.position.x, 2) + Math.pow(this.golfBall.body.position.y - this.body.position.y, 2) + Math.pow(this.golfBall.body.position.z - this.body.position.z, 2)));
    }
    private checkDistanceWithBall() {

        if (this.golfBall != undefined) {
            var distance = this.distanceWithBall();
            if (distance < this.maxDistanceWithBall) {
                this.canShoot = true;
                if (this.canSnap()) {

                    this.Agent.changeState("Snapped");
                }

            } else {
                this.canShoot = false;
            }
        }
    }
    setPositionToBall() {
        if (this.golfBall != undefined && this.golfBall.body != undefined) {
            this.setPosition(this.golfBall.body.position.x, this.golfBall.body.position.y + (this.golfBall.radius * 2) + (this.objectState as WISphere).radius, this.golfBall.body.position.z);
        }

    }
    private tickMoveAndJump() {
        if (this.isMoving && !this.isJumping) {

            var radPad = Math.atan2(this.padVelocity.x, this.padVelocity.y);
            var radian = (this.setterEuler.y) * (Math.PI / 180);
            var x = Math.cos(radian + radPad)
            var y = Math.sin(radian + radPad)

            this.needUpdate = true;
            var asd = -(this.movePower * x);
            var asdy = (this.movePower * y);
            this.body.applyImpulse(new Vec3(asd * this.acceleration, 0, asdy * this.acceleration), this.body.position)
            if (this.acceleration <= this.maxAcceleration) {
                this.acceleration += this.accelerationPower;
            } else {
                this.acceleration += this.accelerationPower / 1000;
            }


        }
        if (!this.isMoving) {
            this.acceleration *= .3;
        }

    }
    afterDeath() {
        this.user.state.gems -= 30;
        this.user.update();
        this.isDeath = false;
        this.user.state.energy = this.maxEnergy;
        this.golfBall.setPosition(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
        this.setPositionToBall();
    }
    public tickDeath() {
        /* if (this.user.state.energy < 0) {
             new WorldRunner(this.world).setTimeout(this.afterDeath.bind(this), this.room.timeToRespawn);
             this.isDeath = true;
 
         }*/
    }
    private triggerAfterShoot() {
        c.triggerEvents(this.afterShootListeners);

    }
    private triggerAfterJump() {
        c.triggerEvents(this.afterJumpListeners);

    }
    shootBall(message: ShotMessage) {
        if (this.canShoot) {
            this.changeCollitionResponse(true);
            this.Agent.changeState("triggerShooting")
            //console.log("Shoot")
            this.addTimeOut("ShootBall Runner", () => {

                this.isShooting = true;
                var radian = (this.setterEuler.y) * (Math.PI / 180);
                var x = (Math.cos(radian) * this.shootForceMultiplier) * message.force;
                var y = (Math.sin(radian) * this.shootForceMultiplier) * message.force;
                var hight = message.force <= 4 ? 0 : (30) * message.force;
                this.golfBall.body.applyImpulse(new Vec3(-x, hight, y), this.golfBall.body.position)

                this.golfBall.spawnPoint.x = this.golfBall.objectState.position.x;
                this.golfBall.spawnPoint.y = this.golfBall.objectState.position.y;
                this.golfBall.spawnPoint.z = this.golfBall.objectState.position.z;
                this.triggerAfterShoot();
                this.isShooting = false;
                this.Agent.changeState("NotSnapped")
                console.log("Shoot")
            }, AnimationTimes.shootBall)



        } else {
            var messagew: MessageToOwner = new MessageToOwner();
            messagew.uID = this.uID;
            messagew.room = this.room.uID;
            messagew.message = "Get closer to your ball!";
            this.world.sendMessageToParent("messageToOwner", messagew);
        }


    }
    use_Power1() {
        this.push();
    }
    push() {
        let rad = new Vec3();
        this.hitBox.body.quaternion.toEuler(rad);
        let x = Math.cos(rad.y);
        let y = Math.sin(rad.y);
        let pad = 30;
        this.ray.from = new Vec3(this.body.position.x, this.hitBox.body.position.y, this.body.position.z);
        console.log(x, y)

        this.ray.from.x -= (x * pad)+this.hitBoxRadius;
        this.ray.from.z += (y * pad)+this.hitBoxRadius;       

        this.ray.to = new Vec3(this.body.position.x, this.body.position.y, this.body.position.z);;
        let dis = 300;

        this.ray.to.x -= x * dis;
        this.ray.to.z += y * dis;
        //this.ray.to.y+=30;

        this.ray.checkCollisionResponse = false;
        this.ray.intersectWorld(this.world.cworld, { mode: 1 })
        
        this.sendMessageDrawLine({x:this.ray.from.x,y:this.ray.from.z},{x:this.ray.to.x,y:this.ray.to.z})
        // console.log(this.ray.result)
        if (this.ray.result.body != undefined) {
            let obj = this.world.getWObjectByBodyID(this.ray.result.body.id);
            if (obj != undefined) {
                let imforce = 300;
                let forv = new Vec3(-x * imforce, 5, y * imforce)
                if (obj instanceof AIBoardObject) {
                    obj.changeMass(1)
                    let colResSave = obj.body.collisionResponse;
                    obj.changeCollitionResponse(true);
                    obj.body.applyImpulse(forv, obj.body.position);
                    
                    this.addTimeOut("Set mass to 0", () => {
                        if (obj instanceof AIBoardObject) {
                            obj.stop();
                            obj.changeCollitionResponse(colResSave);
                            obj.changeMass(0)
                            let board = obj.getBoard();
                            let pos = obj.getObjectBoardPosition(obj);
                            let boardRectSize = obj.getBoardRectSize(board)
                            obj.setPositionToBoard(pos,boardRectSize,board);
                            obj.resetPath();
                        }

                    }, 3000)
                    obj.body.velocity = forv;

                }
                if (obj instanceof hitBox) {
                    obj.player.Agent.changeState("NotSnapped")
                    obj.player.body.applyImpulse(forv, obj.player.body.position);
                }
                console.log(obj.objectState.type, obj.objectState.uID)

            }

        }

    }

    sendMessageDrawLine(pos1:{x:number,y:number},pos2:{x:number,y:number}){
        let ob = new ObjectMessage();
        let mm = {x1:pos1.x,x2:pos2.x,y1:pos1.y,y2:pos2.y};
        ob.assign({uID:this.objectState.uID,message:"draw_line@"+JSON.stringify(mm),room:this.room.uID});
        this.sendMessage(ob);
    }

    onMessage(o: ObjectMessage) {
        /*if (this.AI_Tree != undefined) {
            this.AI_Tree.onMessage(o);
        }*/
    }
    onDestroy() {
        super.onDestroy();
        this.user.onDestroy();
    }
    dropGems(gems: number) {
        for (let index = 0; index < gems; index++) {
            var box: WIBox = new WIBox();
            let size = 10
            box.halfSize = c.createV3(size, size, size);
            box.type = "GemsObject";
            box.mass = 0;
            box.instantiate = true;
            let gem = this.room.createObject(box, this.user.sessionId);
            let pos = this.getPosition();
            let dropExtend = 30;
            pos.x += c.getRandomNumber(-dropExtend, dropExtend);
            pos.y += c.getRandomNumber(0, dropExtend);
            pos.y += gem.objectState.halfSize.y + 5;
            pos.z += c.getRandomNumber(-dropExtend, dropExtend);

            gem.setPosition(pos.x, pos.y, pos.z);
            gem.needUpdate = true;
        }
        this.user.state.gems -= gems;
        this.user.update();
    }


}

class AnimationTimes {
    static shootBall: number = 435;
    static stopBall: number = 25;
    static shoot_Anim_End = 1430;
    static hello: number = 1400;
}

export class hitBox extends WObject {
    player: Player2;
    firstTick() {
        this.player = this.getUser().player;
    }
}

export class Snapped_AS extends AgentState {
    obj: Player2;
    onActivate() {
        this.snap()
        var m = new ObjectMessage();
        m.uID = this.obj.uID;
        m.message = "Snap_true";
        m.room = this.obj.roomID;
        this.obj.sendMessage(m);
        this.obj.hitBoxRadius = 25;
        this.Agent.lock(300);
    }
    snap() {
        this.obj.golfBall.stop();
        this.obj.stop();
        this.obj.setPositionToBall();
    }
    tick() {
        this.snap();
    }
}
export class NotSnapped_AS extends AgentState {
    obj: Player2;
    messageNotSnapped: ObjectMessage = new ObjectMessage();
    onActivate() {
        this.messageNotSnapped.uID = this.obj.uID;
        this.messageNotSnapped.message = "Snap_false";
        this.messageNotSnapped.room = this.obj.roomID;
        this.obj.sendMessage(this.messageNotSnapped);
        this.obj.hitBoxRadius = 0;
        this.obj.changeCollitionResponse(true);
        this.Agent.lock(2000);
    }
    tick() {
    }
}

class TriggerShooting_AS extends AgentState {
    obj: Player2;
    m: ObjectMessage = new ObjectMessage();
    onActivate() {
        this.m.uID = this.obj.uID;
        this.m.message = "trigger_ShootAnim";
        this.m.room = this.obj.roomID;
        this.obj.sendMessage(this.m);
    }
    tick() {
    }
}

class Hello_AS extends AgentState {
    obj: Player2;
    m: ObjectMessage = new ObjectMessage();
    tickSnap: number = 0;
    onActivate() {
        this.m.uID = this.obj.uID;
        this.m.message = "Trigger_Hello";
        this.m.room = this.obj.roomID;
        this.obj.sendMessage(this.m);
        console.log("Trigger Hello")
        this.Agent.lock(AnimationTimes.hello);
    }
    tick() {
    }
}