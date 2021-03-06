import { BehaviorTree, FAILURE, Random, Selector, Sequence, SUCCESS, Task } from "behaviortree";
import { WObject } from ".";
import { c, Waiter } from "../../c";
import { WIBox } from "../../db/WorldInterfaces";
import { WorldRoom } from "../WorldRoom";
import { AIBoardObject } from "./Planning/AIBoardObject";
import { Crocodile } from "./Planning/Crocodile";
import { Flamingo } from "./Planning/Flamingo";

export class TheMind extends WObject {
    room: WorldRoom;
    tree: BehaviorTree;
    createAIWaiter: Waiter;

    AIObject: AIBoardObject= new AIBoardObject(undefined,undefined,undefined);;

    firstTick() {
        this.room = this.getRoom();
        this.addInterval("TheMindTick", this.tick.bind(this), 1);
        console.log("We the mind");

        this.createAIWaiter = new Waiter(1000);
        let Flamingo = new Task({
            run: () => {
                this.createFlamingo();
                return SUCCESS;
            }
        });
        let Crocodile = new Task({
            run: () => {
                this.createCrocodile();
                return SUCCESS;
            }
        });
        let ChooseRandom = new Random({ nodes: [Crocodile] });
        this.tree = new BehaviorTree({
            tree: new Selector({
                nodes: [
                    new Sequence({
                        nodes: [
                            new Task({
                                run: () => {      
                                    if (this.createAIWaiter.wait() && !this.room.objects.has(this.AIObject.uID)) {
                                        return SUCCESS;
                                    }else{
                                        return FAILURE;
                                    }
                                }
                            }),
                            ChooseRandom
                        ]
                    })
                ]
            })
        })
    }
    createCrocodile() {
        let obj = new WIBox();
        obj.halfSize = c.createV3(1, 1, 1);
        obj.position = c.createV3(6, 0, 0);
        obj.mesh = "Board/Crocodile/Crocodile";
        obj.type = "Crocodile";
        obj.instantiate = true;
        this.AIObject = this.room.createObject(obj, undefined) as Crocodile;
    }
    tick() {
        this.tree.step();
    }

    createFlamingo() {
        let obj = new WIBox();
        obj.halfSize = c.createV3(1, 1, 1);
        obj.position = c.createV3(6, 0, 0);
        obj.mesh = "Board/Flamingo/Flamingo";
        obj.type = "Flamingo";
        obj.instantiate = true;
        this.AIObject = this.room.createObject(obj, undefined) as Flamingo;
    }
}