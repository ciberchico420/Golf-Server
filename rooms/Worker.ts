import { GameRoom } from "./GameRoom";

export class SWorker{
    time:number;
    lifetime:number;
    callback:()=>any;
    isInterval:boolean;
    room:GameRoom;

    constructor(room:GameRoom){
        this.room = room;
    }
    setInterval(callback:()=>any, time:number){
        this.lifetime = time;
        this.time = time;
        this.callback = callback;
        this.isInterval = true;
        this.room.WorkersListening.push(this);
    }

    setTimeout(callback:()=>any,time:number){
        this.lifetime = time;
        this.time = time;
        this.callback = callback;
        this.isInterval = false;
        this.room.WorkersListening.push(this);
    }
    delete(){
        this.room.removeWorkerListener(this); 
    }
    tick(){
        
        if(this.lifetime == 0){
            this.callback();
            if(this.isInterval){
                this.lifetime = this.time;
            }else{
                this.delete();
            }
            
        }
        this.lifetime--;
    }
}