import { BoardObject } from "./BoardObject";
//import { BehaviorTree, Sequence, Task, SUCCESS, FAILURE, decorators, RUNNING } from 'behaviortree'
import { Board, WObject } from "..";
import { Waiter } from "../../../c";

export class AIBoardObject extends BoardObject {
    interestingObject: WObject;
    interestingPoint: { x: number, y: number };
   // bTree: BehaviorTree;
   // tree: Sequence;
    path: number[][];
    walkWaiter: Waiter;
    walkSpeed = 1000;
    firstTick() {
        //this.interestingPoint.world.worldRooms[0].users.values().next().value.
        super.firstTick();

        this.walkWaiter = new Waiter(this.walkSpeed);
      /*  BehaviorTree.register('Walk', new Sequence({
            nodes: [


                new Task({
                    run: this.walk.bind(this)
                })
            ]
        }))*/
    }

    getInterestingCoords() {
        if (this.interestingObject != undefined) {
            return this.getObjectBoardPosition(this.interestingObject);
        } else {
            return this.interestingPoint;
        }
    }

    rotateToPoint(x: number, y: number) {
        let mepos = this.boardPosition;
        let angle = this.getDirectionToPoint({ x: mepos.x, y: mepos.y }, { x: x, y: y });
        this.setRotation(0, angle+90, 0);
    }

    walk() {

        if (this.path == undefined) {
            let spath;
            if (this.interestingPoint != undefined) {

                spath = this.room.path.findPath(this.boardPosition, this.interestingPoint)
            } else {
                if (this.interestingObject != undefined) {
                    let pos = this.getObjectBoardPosition(this.interestingObject);
                    spath = this.room.path.findPathFromObject(this, pos)
                }

            }
            if (spath != undefined) {
                if (spath.length > 0) {

                    this.path = spath;

                }
            }

        }
        if (this.path != undefined) {
            if (this.path.length > 0) {
                if (this.walkWaiter.wait()) {

                    let next = Object.assign(this.path[0]);


                    var board = this.world.wobjects.get("board");
                    let boardRectSize = this.getBoardRectSize(board as Board);
                    
                    
                   if (this.path.length > 1) {
                        let next2 = this.path[0];
                        this.rotateToPoint(next2[0], next2[1]);
                    }

                    this.setPositionToBoard({ x: next[0], y: next[1] }, boardRectSize, this.getBoard());
                    


                    this.path.splice(0, 1);


                }
                if (this.path.length == 0) {

                    this.resetPath();
                   // return SUCCESS;
                }
            }
        }
        //return RUNNING;
    }
    setBoardPosition() {
        let lastpos = this.getObjectBoardPosition(this);
        this.boardPosition.x = lastpos.x;
        this.boardPosition.y = lastpos.y;
    }
    resetPath() {
        this.setBoardPosition();
        this.path = undefined;
    }
    treeStep() {
        if (this.getBoard() != undefined) {
            //this.bTree.step({ debug: false });
        }

    }
}

