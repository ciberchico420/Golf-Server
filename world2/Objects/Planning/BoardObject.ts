
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld } from "../../world2";
import { WorldRunner } from "../../WorldRunner";
import { Player2 } from "./../Player2";
import { WIBox, WISphere } from "../../../db/WorldInterfaces";
import { initial } from "lodash";
import CANNON from 'cannon';
import { WorldUser } from "../../WorldUser";
import { WorldRoom } from "../../WorldRoom";
import { Board } from "./Board";
import { posix } from "path";
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
        this.getRoom();
        this.getUser();
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
        position.y = Math.abs(position.y - (this.height - 1));
        const x = ((boardPos.x - board.objectState.halfSize.x + boardRectSize.x) + (position.x * (boardRectSize.x * 2)));
        const y = ((boardPos.z - board.objectState.halfSize.y + boardRectSize.x) + (position.y * (boardRectSize.y * 2)));


        this.setPosition(x, boardPos.y + this.objectState.halfSize.y, y);
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
    getRoom() {
        this.room = this.world.getWorldRoom(this.roomID);
    }
    getUser() {
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
}