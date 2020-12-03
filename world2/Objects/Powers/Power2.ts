import { ObjectState } from "../../../schema/GameRoomState"
import { WObject } from "../WObject"
import { SWorld, WorldUser } from "../../world2"
import { Quaternion } from "cannon"
import { WIObject } from "../../../db/WorldInterfaces";

export class Power2 extends WObject {
    owner:WorldUser;
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        this.needUpdate = true;
    }
    firstTick(){
        this.world.worldRooms.forEach((val)=>{
            val.users.forEach(user => {
                if(user.sessionId == this.objectState.owner.sessionId){
                    this.owner = user;
                }
            });
        })
        if(this.owner == undefined){
            console.log("Owner not found in Power");
        }
        this.throw();
    }
    throw(){
        
    }
    static createWIObject():WIObject{
        return undefined;
    }
}