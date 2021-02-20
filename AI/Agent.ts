import { string } from "@colyseus/schema/lib/encoding/decode";
import { unblockUser } from "@colyseus/social";
import { WObject } from "../world2/Objects";
import { BoardObject } from "../world2/Objects/Planning/BoardObject";
import { SWorld } from "../world2/world2";

export class Agent {
    private state: AgentState;
    private lastState: AgentState;
    world: SWorld;
    private registred: Map<string, AgentState> = new Map();
    private isLocked: boolean = false;
    private lockedTime:number;
    private lockedTick:number = 0;
    constructor(public obj: WObject) {
        this.world = obj.world;
    }

    register(name: string, state: AgentState) {
        this.registred.set(name, state);
    }


    changeState(name: string): void;
    changeState(state: AgentState): void;
    changeState(state: any) {
        if (!this.isLocked) {
            if (this.state != undefined) {
                this.state.onDesactivate();
            }

            if (typeof state === 'string') {
                let ms = this.registred.get(state as string);
                if (ms == undefined) {
                    throw new Error(state + " is not registred.");

                }
                this._checkToChangeState(ms);

            }
            if (state instanceof AgentState) {
                this._checkToChangeState(state);

            }
        }

    }
    lock(milisec:number){
        this.isLocked = true;
        this.lockedTime = milisec;
        this.lockedTick =  0;
    }
    unlock(){
        this.isLocked = false;
        this.lockedTime = undefined;
    }
    private _checkToChangeState(ms: AgentState) {
        if (this.isSameState(ms)) {
            this.state.onRepeat();
        } else {
            this.state = ms;
            this.state.onActivate();
        }
    }
    private isSameState(newState: AgentState) {
        return this.state === newState;
    }
    tick() {
        if (this.state != undefined) {
            this.state.tick();
        }
        if(this.isLocked){
            if(this.lockedTick == this.lockedTime){
                this.unlock();
            }
            this.lockedTick++;

        }

    }
}

export class AgentState {
    obj: WObject;
    constructor(public Agent: Agent) {
        this.obj = this.Agent.obj;
    }
    tick() {

    }
    onActivate(props?:any) {

    }
    onDesactivate() {

    }
    onRepeat() {

    }
}