import { BehaviorTreeBuilder, BehaviorTreeNodeInterface, BehaviorTreeStatus, StateData } from "fluent-behavior-tree";
import { WObject } from "../world2/Objects";

export  default class Tree {
    tree: BehaviorTreeBuilder;
    build: BehaviorTreeNodeInterface;
    constructor(public obj: WObject) {
        this.tree = new BehaviorTreeBuilder();
    }
    setBuild() {
        this.build = this.tree.build();
    }
    tick() {
        if (this.build != undefined) {
            this.build.tick(new StateData(this.obj.world.deltaTime))
        }

    }
}


export class Waiter {
    time: number = 0;
    constructor(public milsecs: number, public onSuccess?: any) {
    }

    hasFinished() {
        return this.time < this.milsecs;
    }

    async wait() {
        if (this.hasFinished()) {
            this.time++;
            return BehaviorTreeStatus.Running;
        } else {
            this.reset();
            if (this.onSuccess != undefined) {
                this.onSuccess();
            }

            return BehaviorTreeStatus.Success;
        }


    }
    reset() {
        this.time = 0;
    }
}