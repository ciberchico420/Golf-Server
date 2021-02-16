
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld} from "../../world2";
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
    static width = 14;
    static height = 7;
    width = BoardObject.width;
    height = BoardObject.height;

    boardPosition:{x:number,y:number,z:number} = {x:0,y:0,z:0};
    boardSize:{x:number,y:number,z:number};

    firstTick() {
        this.getRoom();
        this.getUser();
        this.expand(this.objectState.position, this.objectState.halfSize);
    }
    expand(position: { x: number, y: number, z: number }, size: { x: number, y: number, z: number }) {
        this.boardPosition = Object.assign(this.boardPosition,position);
        this.boardSize = size;
        var board = this.world.wobjects.get("board" + (this.user.player.positionIndex + 1));
        let boardRectSize =  { x: board.objectState.halfSize.y / this.width, y: board.objectState.halfSize.x / this.height };
        this.updateSize({ x: boardRectSize.y * size.x, y: 60, z: boardRectSize.x * size.z });

        this.setPositionToBoard(position, boardRectSize, board);

        this.afterExpand();
    }
    afterExpand() {
    }

    setPositionToBoard(position: { x: number, y: number }, boardRectSize: { x: number, y: number }, board: WObject) {

        var boardPos = board.getPosition();

        var scX = boardRectSize.x;
        var scY = boardRectSize.y;

        const x = (boardPos.z - (this.objectState.halfSize.z)) + (scX * this.width) - ((scX * 2) * position.x);
        const y = (boardPos.x - (this.objectState.halfSize.x)) + (scY * this.height) - ((scY * 2) * position.y);
        this.setPosition(y, boardPos.y + (board.objectState.halfSize.z + position.y), x);
    }
    updateSize(newSize: { x: number, y: number, z: number }) {
        var boxShape = (this.body.shapes[0] as CANNON.Box);
        //boxShape.halfExtents = boxShape.halfExtents.scale(scX)
        boxShape.halfExtents = boxShape.halfExtents.set(newSize.x, newSize.y, newSize.z);
        boxShape.updateConvexPolyhedronRepresentation();
        this.body.shapes[0] = boxShape;
        this.body.computeAABB();
        this.body.updateBoundingRadius();
        this.objectState.halfSize = { x: boxShape.halfExtents.x , y: boxShape.halfExtents.y , z: boxShape.halfExtents.z  };
        this.needUpdate = true;
    }
    getRoom() {
        this.room = this.world.getWorldRoom(this.roomID);
    }
    getUser() {
        this.user = this.room.users.get(this.objectState.owner.sessionId);
    }
    getBoardRectSize(board:Board){
        /**In the game the boards are align to x=y ,y= x */
        return { x: board.objectState.halfSize.y / this.width, y: board.objectState.halfSize.x / this.height };
    }

    getObjectBoardPosition(obj:WObject){
        let pos:{x:number,y:number};
        let board=obj.getBoard();

        if(board != undefined){
            let boardRectSize = this.getBoardRectSize(board);
            let objPos = obj.getPosition();
            let boardPos = board.getPosition();
            objPos.z -=boardPos.z;
    
            pos = {x:objPos.z/(boardRectSize.x*2),y:objPos.x/(boardRectSize.y*2)}

            pos.x +=(this.width/2);
            pos.y +=(this.height/2);
            pos.x = pos.x-this.width;
            pos.y = pos.y-this.height;

            pos.x = Math.abs(pos.x);
            pos.y = Math.abs(pos.y);
            pos.y-=.5;

            pos.x = Math.floor(pos.x);
            pos.y = Math.floor(pos.y);
        }

        return pos;
        
    }
}