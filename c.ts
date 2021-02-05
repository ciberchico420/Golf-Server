import { V3, Quat, BoxObject, UserState, SphereObject, ObjectState } from "./schema/GameRoomState";
import {Quaternion} from 'cannon';
import { WIBox, WIObject, WISphere } from "./db/WorldInterfaces";
export class c {

    static Quaternion = new Quaternion(0,0,0,1);
    static uniqueId() {
        // desired length of Id
        // always start with a letter -- base 36 makes for a nice shortcut
        var idStr = (Math.floor((Math.random() * 25)) + 10).toString(36) + "_";
        // add a timestamp in milliseconds (base 36 again) as the base
        idStr += (new Date()).getTime().toString(36);
        // similar to above, complete the Id using random, alphanumeric characters

        return (idStr);
    }
    static getRandomNumber(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    static initializedV3() {
        var v = new V3();
        v.x = 0;
        v.y = 0;
        v.z = 0;
        return v;
    }
    static createV3(x: number, y: number, z: number) {
        var v = new V3();
        v.x = x;
        v.y = y;
        v.z = z;
        return v;
    }
    static createQuat(x: number, y: number, z: number, w: number): Quat {
        var q = new Quat();
        q.x = x;
        q.y = y;
        q.z = z;
        q.w = w;
        return q;
    }
    static initializedQuat() {
        var v = new Quat();
        v.x = 0;
        v.y = 0;
        v.z = 0;
        v.w = 1;
        return v;
    }

    static serializeBoxObject(copy: BoxObject): BoxObject {
        var obj: BoxObject = new BoxObject();
        var valC: BoxObject = copy;

        obj.position = new V3();
        obj.position.x = valC.position.x;
        obj.position.y = valC.position.y;
        obj.position.z = valC.position.z;

        obj.quaternion = new Quat();
        obj.quaternion.x = valC.quaternion.x;
        obj.quaternion.y = valC.quaternion.y;
        obj.quaternion.z = valC.quaternion.z;
        obj.quaternion.w = valC.quaternion.w;

        obj.halfSize = new V3();
        obj.halfSize.x = valC.halfSize.x;
        obj.halfSize.y = valC.halfSize.y;
        obj.halfSize.z = valC.halfSize.z;

        obj.type = valC.type;
        obj.uID = valC.uID;
        obj.instantiate = valC.instantiate;
        obj.material = valC.material;
        obj.mass = valC.mass;
        obj.mesh = valC.mesh;
        if (valC.owner != undefined) {
            obj.owner = new UserState();
            obj.owner.sessionId = valC.owner.sessionId;
        }


        return obj;
    }
    static serializeObjectState(st: WIObject): ObjectState {
        var obj: ObjectState;
        if ("halfSize" in st) {
            obj = new BoxObject();
        }
        if ("radius" in st) {
            obj = new SphereObject();
        }
        var valC: WIObject = st;

        obj.position = new V3();
        obj.position.x = valC.position.x;
        obj.position.y = valC.position.y;
        obj.position.z = valC.position.z;

        obj.quaternion = new Quat();
        obj.quaternion.x = valC.quat.x;
        obj.quaternion.y = valC.quat.y;
        obj.quaternion.z = valC.quat.z;
        obj.quaternion.w = valC.quat.w;



        obj.type = valC.type;
        obj.uID = valC.uID;
        obj.instantiate = valC.instantiate;
        obj.material = valC.material;
        obj.mass = valC.mass;
        obj.mesh = valC.mesh;
        if (valC.owner != undefined) {
            obj.owner = new UserState();
            obj.owner.sessionId = valC.owner.sessionId;
        }
        if ("halfSize" in valC) {
            (obj as BoxObject).halfSize = new V3();
            (obj as BoxObject).halfSize.x = (valC as WIBox).halfSize.x;
            (obj as BoxObject).halfSize.y = (valC as WIBox).halfSize.y;
            (obj as BoxObject).halfSize.z = (valC as WIBox).halfSize.z;
            return obj as BoxObject;
        }
        if("radius" in valC){
            (obj as SphereObject).radius = (valC as WISphere).radius;
            return obj as SphereObject;
        }
    }

    /* If true is returned it wont delete the function */
    public static triggerEvents(list: Array<() => any>) {
        var saved: Array<() => any> =[];
        list.forEach(val => {
            var v = val();
            if(v === true){
                saved.push(val);
            }

        })
        list.splice(0, list.length);
        saved.forEach((val)=>{
            list.push(val);
        })

    }
    public static toRadian(num:number):number{
        return num * Math.PI/180;
    }
}