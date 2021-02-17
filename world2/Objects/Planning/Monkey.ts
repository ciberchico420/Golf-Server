
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld } from "../../world2";
import { WorldRunner } from "../../WorldRunner";
import { Player2 } from "./../Player2";
import { WISphere } from "../../../db/WorldInterfaces";
import { BoardObject } from "./BoardObject";
import * as PF from 'pathfinding';
import { Agent, AgentState } from "../../../AI/Agent";
import { GolfBall2 } from "../GolfBall2";
import { Board } from "./Board";
import { BehaviorTreeBuilder, BehaviorTreeNodeInterface, BehaviorTreeStatus, StateData } from "fluent-behavior-tree";
import { Vec3 } from "cannon";
import { c } from "../../../c";
import Tree, { Waiter } from "../../../AI/Tree";
import { snakeCase } from "lodash";


export class Monkey extends BoardObject {
    Tree: Tree;

    firstTick() {
        this.body.collisionResponse = false;
        super.firstTick();
        /* this.Agent = new Agent(this);
         this.Agent.changeState(new FindBall(this.Agent));*/
        this.Tree = new MonekeyTree(this);
        new WorldRunner(this.world).setInterval(this.tick.bind(this), 1);

    }

    tick() {
        this.Tree.tick();
    }
    afterExpand() {
    }
}

class MonekeyTree extends Tree {
    closestBall: GolfBall2;
    path: number[][];
    board: Board;
    timerMove: number = 0;
    monkeyVelocity: number = 400;
    waiterThrow: Waiter;
    waiterEatBananas: Waiter;
    

    constructor(public obj: BoardObject) {
        super(obj);

        
        this.waiterThrow = new Waiter(1000)
        this.waiterEatBananas = new Waiter(5000)

        this.tree.parallel("find closest ball and follow it", 2, 2)
            .sequence("Find ball")
            .do("find closest ball", this.findClosestBall.bind(this))
            .do("Go to ball", this.goToBall.bind(this))
            .do("Eat bananas", this.eatBananas.bind(this))
            .do("finish", this.finish.bind(this))
            .end()
            .selector("isClose")
            .condition("isCloseBool", this.isClose.bind(this))
            .sequence("Throw and wait")
            .do("Throw", this.throw.bind(this))
            .do("Wait 1 sec", () => { return this.waiterThrow.wait() })
            .end()
            .do("lookt up to closestBall",this.lookToBall.bind(this))
            .end()

            .end()
        this.setBuild();


    }
    async lookToBall() {
        let ballpos = this.closestBall.getPosition();
        let cos = Math.cos(ballpos.x);
        let sin = Math.sin(ballpos.y);
        let athan = Math.atan2(ballpos.x,ballpos.y);

        this.obj.setRotation(0,athan,0);
        return BehaviorTreeStatus.Success;
    }
    async eatBananas() {
        return this.waiterEatBananas.wait();
    }
    async isClose() {
        let distance = this.closestBall.distancesWith(this.obj);
        return distance > this.obj.objectState.halfSize.y * 2;
    }
    async throw() {
        let multi = 260;
        let power = { x: c.getRandomNumber(-1, 1) * multi, y: c.getRandomNumber(.5, 1) * multi, z: c.getRandomNumber(-1, 1) * multi }
        if(this.closestBall.player.distancesWith(this.obj) < this.obj.objectState.halfSize.y*2){
            this.closestBall.player.jump();
        }
        
        this.closestBall.body.applyImpulse(new Vec3(power.x, power.y, power.z), this.closestBall.body.position);
        console.log("Throw");

        return BehaviorTreeStatus.Success;
    }
    async goToBall(t: StateData) {
        if (this.path.length > 0 || this.path == undefined) {
            if (this.timerMove == this.monkeyVelocity) {
                let next = this.path[0];
                if (this.board == undefined) {
                    this.board = this.obj.getBoard();
                }
                let boardSize = this.obj.getBoardRectSize(this.board);
                this.obj.setPositionToBoard({ x: next[0], y: next[1] }, boardSize, this.board);
                this.timerMove = 0;
                console.log("Running go to ball")
                this.path.splice(0, 1);
            }
            this.timerMove++;
            return BehaviorTreeStatus.Running;
        } else {
            console.log("Success go to ball")
            return BehaviorTreeStatus.Success;

        }
    }
    async findClosestBall() {
        let balls = this.getBalls();
        balls.forEach((ball) => {
            this.closestBall = ball;
            if (this.closestBall == undefined) {
                this.closestBall = ball;
            } else {
                if (this.obj.distancesWith(ball) < this.obj.distancesWith(this.closestBall)) {
                    this.closestBall = ball;
                }
            }
        })
        if (this.closestBall != undefined) {
            let ballPos = this.obj.getObjectBoardPosition(this.closestBall);

            if (ballPos != undefined) {
                try{
                   this.path = this.obj.room.path.findPathFromObject(this.obj, ballPos) 
                }catch(e){
                    console.error(e)
                }
                if (this.path.length >= 1) {
                    console.log("Success finding ball")
                    return BehaviorTreeStatus.Success;
                }
            } else {
                console.log("BallPos is undefined")
            }

        }
        return BehaviorTreeStatus.Running;

    }

    async finish() {
        let lastpos = this.obj.getObjectBoardPosition(this.obj);
        this.obj.boardPosition.x = lastpos.x;
        this.obj.boardPosition.y = lastpos.y;
        this.timerMove = 0;
        this.path = undefined;
        this.closestBall = undefined;
        console.log("Finished");
        return BehaviorTreeStatus.Success;
    }

    getBalls() {
        let balls: GolfBall2[] = [];
        this.obj.room.users.forEach((val) => {
            balls.push(val.player.golfBall);
        })
        return balls;
    }
}