import { Room, Client } from "colyseus.js";
import { MoveMessage } from "../schema/GameRoomState";

export function requestJoinOptions (this: Client, i: number) {
    return { requestNumber: i };
}

var lastTime = 0;

function getRandomArbitrary(min:number, max:number) {
    return Math.random() * (max - min) + min;
  }


export function onJoin(this: Room) {
    console.log(this.sessionId, "joined.");

    var mo = new MoveMessage();
    setInterval(()=>{
      
        mo.x = getRandomArbitrary(-1,1);
        mo.y = getRandomArbitrary(-1,1);;
        this.send("move",mo)

    },100);

    setInterval(()=>{
        this.send("use_Power1",{});
    },10000);
    
        
    

    this.onMessage("*", (type, message) => {
      //  console.log("onMessage:", type, message);
    });
}

function RandomMoves(){
    
}
export function onLeave(this: Room) {
    console.log(this.sessionId, "left.");
}

export function onError(this: Room, err:any) {
    console.error(this.sessionId, "!! ERROR !!", err.message);
}

export function onStateChange(this: Room, state:any) {
}