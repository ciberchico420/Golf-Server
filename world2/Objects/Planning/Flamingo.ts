import { BehaviorTree, FAILURE, RUNNING, Selector, Sequence, SUCCESS, Task } from "behaviortree";
import { c, Waiter } from "../../../c";
import { Gem } from "../Gem";
import { AIBoardObject } from "./AIBoardObject";
import { BoardObject } from "./BoardObject";

export class Flamingo extends AIBoardObject {
    dropGemWaiter: Waiter;
    dieWaiter: Waiter;
    gemsDropedToDelete = 10;
    walkSpeed = 600;
    gems: Gem[] = [];
    firstTick() {
        super.firstTick();
        this.createTree();
        this.dropGemWaiter = new Waiter(1);
        this.dieWaiter = new Waiter(3000);
        this.changeCollitionResponse(false);
    }
    randomPlace() {
        let xr = Math.round(c.getRandomNumber(0, this.width-1));
        let yr = Math.round(c.getRandomNumber(0, this.height-1));
        this.interestingPoint = { x: xr, y: yr };
    }
    dropGem() {
        let obj = this.getRoom().createObject(Gem.createWIObject(), undefined);
        this.gems.push(obj as Gem);
        obj.setPosition(this.body.position.x, this.body.position.y - 5, this.body.position.z)
    }
    createTree() {
        let changeInterestingPointRandmly = new Task({
            run: () => {

                if (this.path == undefined) {
                    this.randomPlace();
                    return SUCCESS;

                }
                return RUNNING;
            }
        });
        let WaitToDie =
            new Sequence({
                nodes: [
                    new Task({
                        run: () => {
                            if (this.gems.length == this.gemsDropedToDelete) {
                                this.setBoardPosition();
                                this.path = (this.getRoom().path.findPathFromObject(this, { x: Math.floor(this.width/2), y:Math.floor(this.height/2) }));
                                return SUCCESS;
                            } else {
                                return FAILURE;
                            }
                        }
                    })
                    , "Walk",
                    new Task({
                        run: () => {
                            if (this.dieWaiter.wait()) {
                                this.world.nextStep(() => {
                                    this.world.destroyObject(this.uID);
                                })
                                return SUCCESS;
                            }
                            return RUNNING;
                        }
                    })
                ]
            });



        let AfterDropGem = new Sequence({
            nodes: [changeInterestingPointRandmly, "Walk",
                new Task({
                    run: () => {
                        if (this.dropGemWaiter.wait()) {
                            this.dropGem();
                        }
                        return SUCCESS;
                    }
                }),]

        })

        this.tree = new Selector({
            nodes: [

                new Sequence({
                    nodes: [
                        new Task({
                            run: () => {
                                if (this.gems.length == this.gemsDropedToDelete) {
                                    return FAILURE;
                                } return SUCCESS;
                            }
                        }),

                        AfterDropGem
                    ]
                }),
                WaitToDie,

            ]
        })

        this.bTree = new BehaviorTree({
            tree: this.tree
        })

        this.addInterval("AI_Interval_" + this.objectState.type + " - " + this.objectState.uID, this.tick.bind(this), 1)
    }
    tick() {
        if (this.body.mass == 0) {
            this.treeStep();
        }

    }
}