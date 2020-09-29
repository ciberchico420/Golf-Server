import { GameRoom } from "../GameRoom";
import { PowerState } from "../../schema/GameRoomState";
import { SUser } from "../../world/SUser";
import { c } from "../../c";

export class Power {
    name = "Undefined name";
    description = "Undefined description";
    duration = 0;
    active: boolean = true;
    room: GameRoom;
    powerState = new PowerState();
    price = 0;
    owner: SUser;
    uniqueID: string;
    type = "notype"
    slot:number = -1;
    emptyPower:PowerState = new PowerState();
    constructor(room: GameRoom) {
        this.room = room;
        this.uniqueID = c.uniqueId();
        
        this.emptyPower.uID = "empty";
        this.emptyPower.type = "empty"
    }
    setOwner(user: SUser) {
        this.owner = user;
    }

    //getNewId

    activate() {
        this.active = true;
        //this.destroy();
    }

    destroy(){
        console.log("Destroy power on slot "+this.slot);
        this.room.getTurnPlayer(this.owner.userState.sessionId).bag.slots[this.slot] = this.emptyPower;
        this.owner.bag.delete(this.uniqueID);
        //console.log("Slot",this.room.getTurnPlayer(this.owner.userState.sessionId).bag.slots[this.slot],this.owner.bag);
    }
    clone(): this {
        return new (this.constructor as typeof Power)(this.room) as this;
    }

    public static load(toLoad: PowerState, power: PowerState): PowerState {
        
        toLoad.uID = power.uID;
        toLoad.cost = power.cost;
        toLoad.UIName = power.UIName;
        toLoad.active = power.active;
       // toLoad.listUsers = power.listUsers;
        toLoad.type = power.type;
        return toLoad;
    }

    giveState(): PowerState {
        this.powerState.uID = this.uniqueID;
        this.powerState.duration = this.duration;
        this.powerState.UIDesc = this.description;
        this.powerState.UIName = this.name;
        this.powerState.cost = this.price;
        this.powerState.type = this.type;
        return this.powerState;
    }

    tick(){

    }




}
