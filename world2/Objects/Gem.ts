import { Player2, WObject } from ".";
import { c } from "../../c";
import { WIBox } from "../../db/WorldInterfaces";
import { WorldUser } from "../WorldUser";

export class Gem extends WObject {
    canOwnerCollect: boolean = false;
    hasBeenCollected = false;
    static createWIObject(): WIBox {
        var box: WIBox = new WIBox();
        let size = 10
        box.halfSize = c.createV3(size, size, size);
        box.type = "Gem";
        box.mass = 0;
        box.mesh = "Board/Gem/Gem_prefab"
        box.instantiate = true;
        return box;
    }
    collect(user: WorldUser) {
        user.state.gems += 1;
        user.update();
        this.hasBeenCollected = true;

        this.world.nextStep(() => {
            this.world.destroyObject(this.objectState.uID);
        })
    }
    firstTick() {
        console.log("Gems object")
        this.changeCollitionResponse(true);
        this.addTimeOut("Wait After drop", () => {
            this.canOwnerCollect = true;
        }, 10000)
        let room = this.getRoom();
        this.body.addEventListener("collide", (e: any) => {
            if (!this.hasBeenCollected) {
                let obj = this.world.getWObjectByBodyID(e.body.id);

                if (obj.objectState.type == "hitBox") {

                    let user = room.users.get(obj.objectState.owner.sessionId)

                    if (user != undefined) {
                        if (this.objectState.owner == undefined) {
                            this.collect(user);
                        } else {
                            if (user.sessionId != this.objectState.owner.sessionId || this.canOwnerCollect) {
                                this.collect(user);
                            }
                        }
                    }


                }
            }


        })
    }
}