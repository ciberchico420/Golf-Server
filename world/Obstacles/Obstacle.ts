import { Room } from "colyseus";
import { GameRoom } from "../../rooms/GameRoom";
import { ObjectState } from "../../schema/GameRoomState";
export class Obstacle{
    room:GameRoom;

    position:{x:number,y:number};

    isActive = false;

    uID = "";
    objectState:ObjectState;

    constructor(room:GameRoom,objectState:ObjectState){
        this.room = room;
        this.objectState = objectState;

    }

    activate(){
        this.isActive = true;
    }
}
    