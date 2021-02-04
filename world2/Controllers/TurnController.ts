import { c } from "../../c";
import { WIBox } from "../../db/WorldInterfaces";
import { ObjectMessage, ObjectState } from "../../schema/GameRoomState";
import { WObject } from "../Objects/WObject";
import { SWorld, WorldRoom } from "../world2";
import { WorldRunner } from "../WorldRunner";

export default class TurnController {
    room: WorldRoom;
    minUsers: number = 1;
    started: boolean = false;
    constructor(room: WorldRoom) {
        this.room = room;
        new WorldRunner(room.world).setInterval(this.tick.bind(this), 1);
        this.createObject();
    }
    createObject() {
        const object = new WIBox();
        object.type="TurnBox"
        object.instantiate = true;
        object.halfSize = c.initializedV3();
        this.room.createObject(object,"");

    }
    beforeStart() {
        //Waiting to fill the room
        if (this.room.users.size == this.minUsers) {
            this.started = true;
            this.room.setState("turnState", "phase", 1);
        }

    }
    tick() {
        if (!this.started) {
            this.beforeStart();
        }
    }
}
export class TurnBox extends WObject {
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
        body.collisionResponse = false;
    }
    onMessage(o:ObjectMessage){
        console.log(o);
        var mm = new ObjectMessage();
        mm.uID = this.uID;
        mm.room = this.roomID;
        mm.message = "bouncing back"
        this.sendMessage(mm);
    }
    
}