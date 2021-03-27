import { Room, Client, } from "colyseus";
import { ArraySchema } from '@colyseus/schema'
import { ObjectState, MapRoomState, BoxObject, SphereObject } from "../schema/GameRoomState";
import { c } from "../c";
import { MapModel, ObjectModel, IMap, IObject, IBox, ISphere, BoxModel, SphereModel } from '../db/DataBaseSchemas';
import e from "express";

export class MapsRoom extends Room {
    map: IMap;
    State: MapRoomState;

    onCreate() {

        this.setState(new MapRoomState);
        this.State = this.state;

        this.onMessage("name", async (client: Client, message: string) => {
            MapModel.find({ name: message }, (err, res) => {
                //console.log(res);
                if (res.length >= 1) {
                    this.map = res[0];

                } else {
                    this.map = new MapModel({ name: message });
                    // this.map.save();
                }
                console.log("Changing map:", this.map.name);
            })
        });

        this.onMessage("objs", (client: Client, message: [ObjectState]) => {
            console.log("Objects", message.length)
            this.map.objects = <IObject[]>[];
            message.forEach(element => {


                var model;
                if("halfSize" in element){
                   model = new BoxModel() 
                }
                if("radius" in element){
                    model = new SphereModel() 
                 }
                model.uID = element.uID;
                model.instantiate = element.instantiate;

                model.position = { x: element.position.x, y: element.position.y, z: element.position.z }
                model.quat = { x: element.quaternion.x, y: element.quaternion.y, z: element.quaternion.z, w: element.quaternion.w}
                model.mass = element.mass;
                

                if (element.mesh != "") {
                    model.mesh = element.mesh;
                    model.isMesh = element.isMesh;
                }
                if ("halfSize" in element) {
                    (<IBox>model).halfSize = (<BoxObject>element).halfSize;
                }
                if ("radius" in element) {
                    (<ISphere>model).radius = (<SphereObject>element).radius;
                }

                model.type = element.type;

                this.map.objects.push(model);


            })

        });

        this.onMessage("startPositions", (client: Client, message: { x: number, y: number, z: number }[]) => {
            console.log("Positions", message.length)
            this.map.startPositions = message;
        })
        this.onMessage("finish", () => {
            this.map.save().then(() => {
                console.log("Map saved...")
                this.map = undefined;
            })

        })

    }
    onJoin(client: Client, options: any) {
        console.log("Joined to maps");
    }
    onLeave() {
        console.log("Bye bye...")
    }
}
