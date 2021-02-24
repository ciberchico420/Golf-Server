import { Player2, WObject } from ".";

export class GemsObject extends WObject {
    canOwnerCollect: boolean = false;
    hasBeenCollected = false;
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
                    if (user.sessionId != this.objectState.owner.sessionId || this.canOwnerCollect) {
                        user.state.gems += 1;
                        user.update();
                        this.hasBeenCollected = true;
           
                        this.world.nextStep(() => {
                            this.world.destroyObject(this.objectState.uID);
                        })
                    } else {

                    }

                }
            }


        })
    }
}