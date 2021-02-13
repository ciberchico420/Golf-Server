
import { ObjectState } from "../../../schema/GameRoomState";
import { WObject } from "./../WObject";
import { SWorld, WorldRoom, WorldUser } from "../../world2";
import { WorldRunner } from "../../WorldRunner";
import { Player2 } from "./../Player2";
import { WIBox, WISphere } from "../../../db/WorldInterfaces";
import { initial } from "lodash";
import CANNON from 'cannon';
export class BoardObject extends WObject {
    user: WorldUser;
    room: WorldRoom;
    width = 14;
    height = 7;

    boardPosition:{x:number,y:number,z:number};
    boardSize:{x:number,y:number,z:number};
    constructor(bodyState: WIBox, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        console.log("Constructor", bodyState.position);
    }

    firstTick() {
        this.getRoom();
        this.getUser();
        new WorldRunner(this.world).setTimeout(() => {
            this.expand(this.objectState.position, this.objectState.halfSize);
        }, 100);
    }
    expand(position: { x: number, y: number, z: number }, size: { x: number, y: number, z: number }) {

        this.boardPosition = position;
        this.boardSize = size;
        var board = this.world.wobjects.get("board" + (this.user.player.positionIndex + 1));
        var boardRectSize = { x: board.objectState.halfSize.y / this.width, y: board.objectState.halfSize.x / this.height };
        
        this.updateSize({ x: boardRectSize.y * size.x, y: 60, z: boardRectSize.x * size.z });

        this.setPositionToBoard(position, boardRectSize, board);
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
}