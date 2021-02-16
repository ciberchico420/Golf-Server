import { WIObject } from "../db/WorldInterfaces";
import { WObject } from "./Objects";
import { BoardObject } from "./Objects/Planning/BoardObject";
import { SWorld } from "./world2";
import { WorldUser } from "./WorldUser";
import * as PF from 'pathfinding';

export class WorldRoom {
    filterGroup: number;
    uID: string;

    objects: Map<string, WObject> = new Map();
    users: Map<string, WorldUser> = new Map();
    world: SWorld;
    timeToRespawn: number = 3000;
    path:Path;
    

    constructor(index: number, uID: string, world: SWorld) {
        this.world = world;
        this.filterGroup = Math.pow(2, index + 1);
        this.uID = uID;
        console.log("World " + uID + " has been assigned to filterGroup " + this.filterGroup);
        this.path = new Path();
    }
    getWObject(bodyID: number): WObject {
        this.objects.forEach((value) => {
            if (value.body.id == bodyID) {
                return value;
            }
        });
        return null;
    }


    findUserByHitBox(hitboxBody: CANNON.Body): WorldUser {
        var found: WorldUser;
        this.users.forEach(val => {
            if (val.player.hitBox.body == hitboxBody) {

                found = val;
            }
        })
        return found;
    }

    createObject(object: WIObject, owner: string) {
        if (this.world.wobjects.get(object.uID) == undefined) {
            var ob;
            if ("halfSize" in object) {
                ob = this.world.createBox(object);
            }
            if ("radius" in object) {
                ob = this.world.createSphere(object);

            }
            if (owner !== undefined) {
                var us = this.users.get(owner)
                if (us == undefined) {
                    us = new WorldUser(this.world, owner, this);
                    this.users.set(owner, us);
                    console.log("Creating worldUser", ob.objectState.type)
                }
                ob.objectState.owner = us.state;
            }
            ob.body.collisionFilterGroup = this.filterGroup;
            ob.body.collisionFilterMask = 1 | this.filterGroup;
            ob.roomID = this.uID;
            this.objects.set(ob.uID, ob);
            ob.needUpdate = true;
            return ob;
        } else {

            this.updateObjectFromQuixRoom(object);
        }
    }
    updateObjectFromQuixRoom(object: WIObject) {
        var sb = this.world.wobjects.get(object.uID);

        if (sb instanceof BoardObject) {
            sb.expand(object.position, object.halfSize);
        } else {

            if (object.position != undefined) {
                sb.setPosition(object.position.x, object.position.y, object.position.z);
            }
            if (object.quat != undefined) {
                sb.setRotationQ(object.quat.x, object.quat.y, object.quat.z, object.quat.w);
            }

        }
    }

    setState(path: string, property: string, value: any) {
        this.world.sendMessageToParent("setState", { path: path, property: property, value: value, room: this.uID });
    }
}

class Path{
    grid:PF.Grid;
    finder:PF.AStarFinder;
    constructor(){
        this.grid = new PF.Grid(14,7);
        this.finder = new PF.AStarFinder();
        
    }

    setWalkableAt(x:number,y:number,walkable:boolean){
        this.grid.setWalkableAt(x,y,walkable);
    }

    findPath(from:{x:number,y:number},to:{x:number,y:number}):number[][]{
        this.grid = new PF.Grid(14,7);
        return this.finder.findPath(from.x,from.y,to.x,to.y,this.grid);
    }

    findPathFromObject(obj:BoardObject,to:{x:number,y:number})/*:number[][]*/{
        let path = this.findPath(obj.boardPosition,to);
        console.log(path);
       return path;
    }
}