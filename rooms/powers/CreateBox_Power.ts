import { Power } from "./Power";
import { GameRoom } from "../GameRoom";
import { PowerState, BoxObject, SphereObject, V3, Quat } from "../../schema/GameRoomState";
import { Client } from "colyseus";
import { BoxModel, SphereModel } from "../../db/DataBaseSchemas";
import { c } from "../../c";
import { SObject } from "../../world/SObject";
import { Types } from "mongoose";
import { Box, Vec3 } from "cannon";
import { ModelsLoader } from "../../world/loadModels";

export class CreateBox_Power extends Power {
    price = 4;
    type = "CreateBox"
    box: BoxObject = new BoxObject();
    sob: SObject;
    trownBox: boolean = false;

    deleteTime = 30000;
    exitTrowTick = 0;
    constructor(room: GameRoom) {
        super(room);
    }
    activate() {
        super.activate();
        
            this.room.addPowerListener(this);
            this.owner.client.send("trowMode", this.box);

            this.room.onMessage("trowBox", (client: Client, box: BoxObject) => {
                if (!this.trownBox) {
                var model = new BoxModel();
                model.uID = c.uniqueId();
                model.position = c.initializedV3();

                model.quat = c.initializedQuat();
                model.quat.x = box.quaternion.x;
                model.quat.y = box.quaternion.y;
                model.quat.z = box.quaternion.z;
                model.quat.w = box.quaternion.w;

                model.halfSize = new V3();
                model.halfSize.x = box.halfSize.x / 2;
                model.halfSize.y = box.halfSize.y / 2;
                model.halfSize.z = box.halfSize.z / 2;
                model.material = "ballMaterial";
                model.type = "trownobj";
                model.instantiate = true;
                this.sob = this.room.world.createBox(model, this.owner.client);
                this.sob.setPosition(box.position.x, box.position.y, box.position.z);
                this.sob.setRotationQ(model.quat.x, model.quat.y, model.quat.z, model.quat.w);
                this.sob.changeMass(3);
                this.trownBox = true;

                this.destroy();
                }

            })
        

    }

    tick() {
        if (this.sob != undefined) {


            this.room.clock.setTimeout(() => {

                this.room.world.deleteObject(this.sob);
            }, this.deleteTime)



            if (this.exitTrowTick == 140) {
                this.owner.client.send("exitTrowMode", true);
                this.room.removePowerListener(this);
                this.exitTrowTick = 0;
            }
            this.exitTrowTick++;
        }

    }
}