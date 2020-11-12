import { Room } from "colyseus";
import { SWorld } from "./world2";

export class WorldRunner{
    time:number;
    lifetime:number;
    callback:()=>any;
    isInterval:boolean;
    world:SWorld;

    constructor(world:SWorld){
        this.world = world;
    }
    setInterval(callback:()=>any, time:number){
        this.lifetime = time;
        this.time = time;
        this.callback = callback;
        this.isInterval = true;
        this.world.RunnersListening.push(this);
    }

    setTimeout(callback:()=>any,time:number){
        this.lifetime = time;
        this.time = time;
        this.callback = callback;
        this.isInterval = false;
        this.world.RunnersListening.push(this);
    }
    delete(){
        this.world.removeRunnerListener(this); 
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