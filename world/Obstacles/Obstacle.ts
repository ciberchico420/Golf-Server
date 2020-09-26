import { Room } from "colyseus";
import { GameRoom } from "../../rooms/GameRoom";
import { ObjectState } from "../../schema/GameRoomState";
export class Obstacle{
    room:GameRoom;

    position:{x:number,y:number};

    isActive = false;
    objectState:ObjectState;

    constructor(room:GameRoom,objectState:ObjectState){
        this.room = room;
        this.objectState = objectState;
        room.addObstacleListener(this);

    }

    destroy(){
        this.room.world.sObstacles.delete(this.objectState.uID);
        this.room.removeObstacleListener(this);
    }

    tick(){

    }

    activate(){
        this.isActive = true;
    }
}
    