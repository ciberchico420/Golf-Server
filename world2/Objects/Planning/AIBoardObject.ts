import { BoardObject } from "./BoardObject";
import { BehaviorTree, Sequence, Task, SUCCESS, FAILURE, decorators } from 'behaviortree'
import { Board, WObject } from "..";
import { Waiter } from "../../../c";

export class AIBoardObject extends BoardObject {
    interestingPoint: WObject;
    bTree: BehaviorTree;
    tree: Sequence;
    path: number[][];
    walkWaiter: Waiter;
    firstTick() {
        //this.interestingPoint.world.worldRooms[0].users.values().next().value.
        super.firstTick();

        this.interestingPoint = this.user.player.golfBall;

        BehaviorTree.register('Walk', new Task({
            run: this.walk.bind(this)
        }))
    }

    rotateToPoint(x: number, y: number) {
        let mepos = this.getPosition()
        let angle = this.getDirectionToPoint({ x: mepos.x, y: mepos.z }, { x: x, y: y });
        this.setRotation(0, -angle, 0);
    }

    walk() {

        if (this.path == undefined) {
            let pos = this.getObjectBoardPosition(this.interestingPoint);

            let spath = this.room.path.findPathFromObject(this, pos)
            if (spath != undefined) {
                if (spath.length > 0) {

                    this.path = spath;
                    this.walkWaiter = new Waiter(1000);
                }
            }

        }
        if (this.path != undefined) {
            if (this.path.length > 0) {
                let pos = this.getObjectBoardPosition(this.interestingPoint);

                if (this.walkWaiter.wait()) {

                    let next = this.path[0];
                    let next2 = this.path[1];
                    var board = this.world.wobjects.get("board");
                    let boardRectSize = this.getBoardRectSize(board as Board);

                    this.setPositionToBoard({ x: next[0], y: next[1] }, boardRectSize, this.getBoard());
                    this.path.splice(0, 1);

                    if (next2 != undefined) {
                        let po = this.getPointToBoardPosition(next2[0], next2[1])
                        this.rotateToPoint(po.x, po.y);
                    }
                }
                if (this.path.length == 0) {
                   
                    this.resetPath();
                    return SUCCESS;
                }
            }
        }
    }
    resetPath(){
        let lastpos = this.getObjectBoardPosition(this);
        this.boardPosition.x = lastpos.x;
        this.boardPosition.y = lastpos.y;
        this.path = undefined;
    }
    treeStep() {
        this.bTree.step({ debug: false });
        // console.log(this.tree.blueprint)
    }
}

