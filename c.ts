import { V3, Quat, BoxObject } from "./schema/GameRoomState";

export class c {

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
    static createQuat(x: number, y: number, z: number, w: number):Quat {
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

    static serializeBoxObject(copy: BoxObject):BoxObject {
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

        return obj;
    }
}