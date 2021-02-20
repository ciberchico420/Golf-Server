import { WIUserState } from "../db/WorldInterfaces";
import { Player2 } from "./Objects";
import { SWorld } from "./world2";
import { WorldRoom } from "./WorldRoom";
import { WorldRunner } from "./WorldRunner";

export class WorldUser {
    world: SWorld;
    sessionId: string;
    room: WorldRoom;
    player: Player2;
    state: WIUserState;
    addGemsRunnerRunner: WorldRunner;
    constructor(world: SWorld, clientID: string, room: WorldRoom) {
        this.world = world;
        this.sessionId = clientID;
        this.room = room;
        this.state = new WIUserState(clientID);

        // this.addGemsRunner();
    }
    update() {
        this.world.sendMessageToParent("updateUser", { room: this.room.uID, state: this.state });
    }

    onDestroy() {
        if (this.addGemsRunnerRunner != undefined) { this.addGemsRunnerRunner.delete(); }


        this.room.users.delete(this.sessionId);
    }

    private addGemsRunner() {
        this.addGemsRunnerRunner = new WorldRunner(this.world, "AddGemsRunner" + this.sessionId);
        this.addGemsRunnerRunner.setInterval(() => {
            this.state.gems += 10;
            this.update();
        }, 10000)
    }
}
