import { Room, Client } from "colyseus.js";
import { c } from "../c";
import { MoveMessage } from "../schema/GameRoomState";

export function requestJoinOptions (this: Client, i: number) {
    return { requestNumber: i };
}


export function onJoin(this: Room) {
    console.log(this.sessionId, "joined.");

    this.onMessage("*", (type, message) => {
        console.log("onMessage:", type, message);
    });
    setInterval(()=>{
    this.send("moveR","random")
   },5000);
}
export function onLeave(this: Room) {
    console.log(this.sessionId, "left.");
}

export function onError(this: Room, err:any) {
    console.error(this.sessionId, "!! ERROR !!", err.message);
}

export function onStateChange(this: Room, state:any) {
}