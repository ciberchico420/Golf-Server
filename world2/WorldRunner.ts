import { Room } from "colyseus";
import { SWorld } from "./world2";

export class WorldRunner{
    time:number;
    lifetime:number;
    callback:(runner:WorldRunner)=>any;
    isInterval:boolean;
    world:SWorld;
    

    constructor(world:SWorld,public name:string){
        this.world = world;
    }
    setInterval(callback:(runner?:WorldRunner)=>any, time:number){
        this.lifetime = time;
        this.time = time;
        this.callback = callback;
        this.isInterval = true;
        if(this.world.RunnersListening.has(this.name)){
            throw new Error("Runner with the same name >:C");
        
        }else{
            this.world.RunnersListening.set(this.name,this);
        }
        
    }

    setTimeout(callback:(runner?:WorldRunner)=>any,time:number){
        this.lifetime = time;
        this.time = time;
        this.callback = callback;
        this.isInterval = false;
        this.world.RunnersListening.set(this.name,this);
    }
    delete(){
        this.world.removeRunnerListener(this); 
    }
    tick(){
        
        if(this.lifetime == 0){
            this.callback(this);
            if(this.isInterval){
                this.lifetime = this.time;
            }else{
                this.delete();
            }
            
        }
        this.lifetime--;
    }
}