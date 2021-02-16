import { ObjectState } from "../../../schema/GameRoomState"
import { WObject } from "../WObject"
import { SWorld } from "../../world2"
import { Quaternion } from "cannon"
import { WIObject } from "../../../db/WorldInterfaces";
import { Player2 } from "..";
import { WorldUser } from "../../WorldUser";

export class Power2 extends WObject {
    owner:WorldUser;
    attackMultiplier:number = 0.3;
    
    constructor(bodyState: WIObject, body: CANNON.Body, world: SWorld) {
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
    calcDamage(target:Player2):number{
        var damage:number = (this.owner.player.attack*this.attackMultiplier)*((100/target.defense+100)-100);
        console.log("damage",damage);
        return damage;
    }
    static createWIObject():WIObject{
        return undefined;
    }
}