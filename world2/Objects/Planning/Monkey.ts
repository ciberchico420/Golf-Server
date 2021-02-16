
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

export class Monkey extends BoardObject {
    AIstate: string;
    Agent: Agent;


    firstTick() {
        super.firstTick();
        this.Agent = new Agent(this);
        this.Agent.changeState(new FindBall(this.Agent));
        new WorldRunner(this.world).setInterval(this.tick.bind(this), 1);
    }
    tick() {
        this.Agent.tick();
    }
    afterExpand() {
    }
}

class FindBall extends AgentState {
    isFinding: boolean = false;
    ballToFind: GolfBall2;
    path: number[][];
    velocity = 500;
    timerMove = 0;
    board: Board;
    closestBall: WObject;
    tick() {

        if (!this.isFinding) {
            let balls = this.getBalls();
            
            balls.forEach((ball) => {
                if (this.closestBall == undefined) {
                    this.closestBall = ball;
                } else {
                    if (this.Agent.boardObject.distancesWith(ball) < this.Agent.boardObject.distancesWith(this.closestBall)) {
                        this.closestBall = ball;
                    }
                }
            })
            let ballPos = this.Agent.boardObject.getObjectBoardPosition(this.closestBall);
            this.path = this.Agent.boardObject.room.path.findPathFromObject(this.Agent.boardObject, ballPos)
            console.log("Looking for ball in ",ballPos,this.path);
            if (ballPos != undefined) {
                this.isFinding = true;
            }

        } else {
            
            if (this.timerMove == this.velocity) {
                this.nextSpace();
            }
            this.timerMove++;
        }
    }
    isCloseToBall(){
        return  (this.closestBall.distancesWith(this.Agent.boardObject) < 50)
    }
    finish(){
        let lastpos = this.Agent.boardObject.getObjectBoardPosition(this.Agent.boardObject);
        this.Agent.boardObject.boardPosition.x = lastpos.x;
        this.Agent.boardObject.boardPosition.y = lastpos.y;
        this.isFinding = false;
        this.timerMove = 0;
        this.path = undefined;
        console.log("Finished");
    }
    nextSpace() {
        console.log(this.path.length);
        this.path.splice(0, 1);
        if(this.isCloseToBall()){
            console.log("Lanzar pelota!");
        }
        if (this.path.length > 0) {
            let next = this.path[0];
            let gb = this.Agent.boardObject.getBoard();
            if (gb != undefined) {
                this.board = gb;
            }
            let boardSize = this.Agent.boardObject.getBoardRectSize(this.board);
            this.Agent.boardObject.setPositionToBoard({x:next[0],y:next[1]},boardSize,this.board);
            this.timerMove = 0;
        } else {
            //Finish path
            this.finish();
        }

    }

    getBalls() {
        let balls: GolfBall2[] = [];
        this.Agent.boardObject.room.users.forEach((val) => {
            balls.push(val.player.golfBall);
        })
        return balls;
    }
}
