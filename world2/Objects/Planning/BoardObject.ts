
import { WObject } from "./../WObject";
import CANNON from 'cannon';
import { WorldUser } from "../../WorldUser";
import { WorldRoom } from "../../WorldRoom";
import { Board } from "./Board";
export class BoardObject extends WObject {
    user: WorldUser;
    room: WorldRoom;
    static width = 17;
    static height = 9;
    width = BoardObject.width;
    height = BoardObject.height;

    boardPosition: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 };
    boardSize: { x: number, y: number, z: number };
    ignoreScale: boolean = false;

    firstTick() {
        this.setRoom();
        this.setUser();
        this.expand(this.objectState.position, this.objectState.halfSize);
    }
    expand(position: { x: number, y: number, z: number }, size: { x: number, y: number, z: number }) {
        this.boardPosition = Object.assign(this.boardPosition, position);
        this.boardSize = size;
        var board = this.world.wobjects.get("board");
        let boardRectSize = this.getBoardRectSize(board as Board);
        this.updateSize({ x: boardRectSize.x * size.x, y: boardRectSize.x, z: boardRectSize.y * size.z });

        this.setPositionToBoard(position, boardRectSize, board);

        this.afterExpand();
    }
    afterExpand() {
    }

    setPositionToBoard(position: { x: number, y: number }, boardRectSize: { x: number, y: number }, board: WObject) {

        var boardPos = board.getPosition();

        position.y = Math.abs(position.y - (this.height)) - 1;
 

        let x = ((boardPos.x - board.objectState.halfSize.x + boardRectSize.x) + (position.x * (boardRectSize.x * 2)));
        let y = ((boardPos.z - board.objectState.halfSize.y + boardRectSize.y) + (position.y * (boardRectSize.y * 2)));
        if (this.boardSize.x > 1) {
            
            x += this.boardSize.x * (boardRectSize.x * 2);
            x -= this.objectState.halfSize.x;
            x -= boardRectSize.x;
            
        }
        if (this.boardSize.z > 1) {
            y -= this.boardSize.z * (boardRectSize.y * 2);
            y += this.objectState.halfSize.z;
            y += boardRectSize.y;
        }


        this.setPosition(x, boardPos.y + (this.objectState.halfSize.y)+board.objectState.halfSize.z, y);
        this.needUpdate = true;
    }
    updateSize(newSize: { x: number, y: number, z: number }) {
        if (!this.ignoreScale) {
            var boxShape = (this.body.shapes[0] as CANNON.Box);
            //boxShape.halfExtents = boxShape.halfExtents.scale(scX)
            boxShape.halfExtents = boxShape.halfExtents.set(newSize.x, newSize.y, newSize.z);
            boxShape.updateConvexPolyhedronRepresentation();
            this.body.shapes[0] = boxShape;
            this.body.computeAABB();
            this.body.updateBoundingRadius();
            this.objectState.halfSize = { x: boxShape.halfExtents.x, y: boxShape.halfExtents.y, z: boxShape.halfExtents.z };
            this.needUpdate = true;
        }

    }
    setRoom() {
        this.room = this.world.getWorldRoom(this.roomID);
    }
    setUser() {
        this.user = this.room.users.get(this.objectState.owner.sessionId);
    }
    getBoardRectSize(board: Board) {
        /**In the game the boards are align to x=y ,y= x */
        return { x: board.objectState.halfSize.x / this.width, y: board.objectState.halfSize.y / this.height };
    }

    getObjectBoardPosition(obj: WObject) {
        let pos: { x: number, y: number };
        let board = obj.getBoard();

        if (board != undefined) {
            let objPos = obj.getPosition();
            let boardPos = board.getPosition();
            let boardRectSize = this.getBoardRectSize(board);
            objPos.x -= boardPos.x;
            objPos.z -= boardPos.z;

            pos = { x: objPos.x / (boardRectSize.x * 2), y: objPos.z / (boardRectSize.y * 2) }
            pos.x += (this.width / 2);
            pos.y += (this.height / 2);
            pos.y = (pos.y - this.height) * -1;

            pos.x = Math.floor(pos.x);
            pos.y = Math.floor(pos.y);
        }

        return pos;

    }
    getPointToBoardPosition(x:number,y:number) {
        let pos: { x: number, y: number };

        let board = this.getBoard();

        if (board != undefined) {
           
            let boardPos = board.getPosition();
            let boardRectSize = this.getBoardRectSize(board);
           

            pos = { x: boardPos.x+x / (boardRectSize.x * 2), y: y / (boardRectSize.y * 2) }
            pos.x += (this.width / 2);
            pos.y += (this.height / 2);
            pos.y = (boardPos.z-pos.y - this.height) * -1;

            pos.x = Math.floor(pos.x);
            pos.y = Math.floor(pos.y);
        }

        return pos;

    }
}