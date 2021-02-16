import { BoardObject } from "../world2/Objects/Planning/BoardObject";
import { SWorld } from "../world2/world2";

export class Agent{
    state:AgentState;
    lastState:AgentState;
    world:SWorld;
    constructor(public boardObject:BoardObject){
        this.world = boardObject.world;
    }

    changeState(state:AgentState){
        this.state = state;
    }
    tick(){
        this.state.tick();
    }
}

export class AgentState{
    constructor(public Agent:Agent){}
    tick(){

    }
}