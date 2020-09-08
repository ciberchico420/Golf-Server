import { GameRoom } from "../GameRoom";
import { PowerState } from "../../schema/GameRoomState";
import { SUser } from "../../schema/SUser";
import { c } from "../../c";

export class Power{
    name = "Undefined name";
    description = "Undefined description";
    duration = 0;
    active:boolean = true;
    room:GameRoom; 
    powerState = new PowerState();
    price = 0;
    owner:SUser;
    uniqueID:string;

    constructor(room:GameRoom){
        this.room = room;
        this.uniqueID = c.uniqueId();
    }
    setOwner(user:SUser){
        this.owner = user;
    }

    onActivate(){
        this.active = true;
    }

    giveState():PowerState{
       
        this.powerState.duration = this.duration;
        this.powerState.UIDesc = this.description;
        this.powerState.UIName = this.name;
        return this.powerState;
    }



    
}