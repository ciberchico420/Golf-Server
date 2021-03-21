import { Room, Client } from "colyseus.js";

export function requestJoinOptions (this: Client, i: number) {
    return { requestNumber: i };
}

var lastTime = 0;


export function onJoin(this: Room) {
    console.log(this.sessionId, "joined.");

/*
    setInterval(()=>{
        console.log("Creating boxes");
        this.send("use_Power1",{});

    },10000);*/
    
        //this.send("move",{x:1,y:0,rotX:0,rotY:0})
    

    this.onMessage("*", (type, message) => {
        console.log("onMessage:", type, message);
    });
}
export function onLeave(this: Room) {
    console.log(this.sessionId, "left.");
}

export function onError(this: Room, err:any) {
    console.error(this.sessionId, "!! ERROR !!", err.message);
}

export function onStateChange(this: Room, state:any) {
}