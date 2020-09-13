import { V3, Quat } from "./schema/GameRoomState";

export class c {
    static uniqueId () {
        // desired length of Id
        // always start with a letter -- base 36 makes for a nice shortcut
        var idStr = (Math.floor((Math.random() * 25)) + 10).toString(36) + "_";
        // add a timestamp in milliseconds (base 36 again) as the base
        idStr += (new Date()).getTime().toString(36);
        // similar to above, complete the Id using random, alphanumeric characters
    
        return (idStr);
    }
    static getRandomNumber(min:number, max:number) {
        return Math.random() * (max - min) + min;
      }

      static initializedV3(){
          var v = new V3();
          v.x = 0;
          v.y = 0;
          v.z = 0;
          return v;
      }
      static initializedQuat(){
        var v = new Quat();
        v.x = 0;
        v.y = 0;
        v.z = 0;
        v.w  =1;
        return v;
    }
}