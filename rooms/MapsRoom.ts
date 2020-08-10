import { Room, Client } from "colyseus";
import { WorldState, ObjectState, MapInfo, MapRoomState, BoxObject, SphereObject, PolyObject } from "../schema/GameRoomState";
import { c } from "../c";
import { MapModel, ObjectModel, IMap, IObject, IBox, ISphere, IPoly, ITile, TileModel } from '../db/DataBaseSchemas';
import { SObject } from "../world/SObject";
import { MWorld } from "../world/world";
import e from "express";

export class MapsRoom extends Room {
    currentMap: string = "";
    map: IMap;
    State: MapRoomState;

    onCreate() {

        this.setState(new MapRoomState);
        this.State = this.state;

        this.onMessage("name", async (client: Client, message: string) => {
            this.currentMap = message;

            MapModel.find({ name: message }, (err, res) => {
                if (res.length >= 1) {
                    this.map = res[0];
                } else {
                    this.map = new MapModel({ name: message });
                    // this.map.save();
                }
                this.State.maps[message] = new MapInfo();

            })


        });

        this.onMessage("tiles",(client: Client, message: [ObjectState])=>{
            this.map.tiles =  <ITile[]>[];

           
            message.forEach(element => { 
                
                var model = new TileModel({});
                model.position = { x: element.position.x, y: element.position.y, z: element.position.z }
                model.quat = { x: MWorld.smallFloat(element.quaternion.x), y: MWorld.smallFloat(element.quaternion.y), z: MWorld.smallFloat(element.quaternion.z), w: MWorld.smallFloat(element.quaternion.w )}
                model.tile = parseInt(element.type);
                this.map.tiles.push(model);
            })

            
        })

        this.onMessage("objs", (client: Client, message: [ObjectState]) => {

            this.map.objects =  <IObject[]>[];


            message.forEach(element => {


                var model = new ObjectModel({ uID: element.uID ,material:element.material});

                model.position = { x: element.position.x, y: element.position.y, z: element.position.z }
                model.quat = { x: MWorld.smallFloat(element.quaternion.x), y: MWorld.smallFloat(element.quaternion.y), z: MWorld.smallFloat(element.quaternion.z), w: MWorld.smallFloat(element.quaternion.w )}
                if (element.type == "box" || element.type == "checkpoint") {
                    (<IBox>model).halfSize = (<BoxObject>element).halfSize;

                }
                if (element.type == "ballspawn") {
                    this.map.ballspawn = { x: element.position.x, y: element.position.y, z: element.position.z }
                    

                }
                if (element.type == "hole") {
                    (<ISphere>model).radius = (<SphereObject>element).radius;
                } 
                if (element.type == "addmass") {
                    (<ISphere>model).radius = (<SphereObject>element).radius;
                } 
                if(element.type == "poly"){
                   // 
                    (<IPoly>model).verts= new Array<{x:number,y:number,z:number}>();

                    var verts = (<any>element).verts;
                    var faces = (<any>element).faces;

               
                    for (let index = 0; index <  verts.Count; index++) {
                        const e =  verts.Items[index][1];
       
                        (<IPoly>model).verts.push({x:e.x,y:e.y,z:e.z});
                        
                    }
                    for (let index = 0; index <  faces.Count; index++) {
                        const e =  faces.Items[index][1];
    
                        (<IPoly>model).faces.push(e);
                        
                    }
                    
                }
                model.type = element.type;


                this.map.objects.push(model);
                



            })

        });

        setInterval(() => { if (this.map) this.map.save() }, 100);

    }
    onJoin(client: Client, options: any) {
        console.log("Joined to maps");
    }
    onLeave() {
        console.log("Bye bye...")
    }
}
