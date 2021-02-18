import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'
import { string } from '@colyseus/schema/lib/encoding/decode';

export class V3 extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
}
export class Quat extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
    @type("number") w: number = 0;

}

export class ArenaItemState extends Schema {
    @type(V3) position = new V3();
    @type("string") uID: string;
    @type("string") type: string;
    @type("number") width: number = 1;
    @type("number") height: number = 1;
    @type("number") price: number = 1;
    @type("string") owner: string;

   /* assign(uID:string,type:string,price:number){
        this.uID = uID;
        this.type = type;
        this.price = price;
    }*/
    setSize(height:number,width:number){
        this.height = height;
        this.width = width;
    }
    setPosition(x:number,y:number){
        this.position.x = x;
        this.position.y = y;
    }

}
export class UserState extends Schema {
    @type("string") sessionId: string;
    @type("string") name: string;
    @type("number") gems: number = 0;
    @type("number") energy: number = 0;
    @type({map: ArenaItemState }) shop = new MapSchema<ArenaItemState>();
    @type({map: ArenaItemState }) board = new MapSchema<ArenaItemState>();

}
export class ObjectState extends Schema {
    @type(V3) position = new V3();
    @type(Quat) quaternion = new Quat();
    @type("string") type = "object";
    @type(UserState) owner: UserState;
    @type("string") uID: string;
    @type("boolean") instantiate:boolean;
    @type("string") material:string;
    @type("number") mass: number = 0;
    @type("string") mesh:string;

}

export class SphereObject extends ObjectState {
    @type("number") radius: number;
}
export class BoxObject extends ObjectState {
    @type(V3) halfSize = new V3();
}

export class WorldState extends Schema {
    @type({ map: ObjectState }) objects = new MapSchema<ObjectState>();
}
export class TurnsState extends Schema {
    @type("string") winner = "";
    @type("number") turn = 0;
    @type("number") phase = 0; /* 0= waiting, 1= planning 2= playing */
    @type(["string"]) ready = new ArraySchema<string>();
    
}
export class GameState extends Schema {
    @type(WorldState) world = new WorldState();
    @type({ map: UserState }) users = new MapSchema<UserState>();
    @type(UserState) winner: UserState;
    @type("string") name: string;
    @type("string") mapName: string;
    @type(TurnsState) turnState = new TurnsState();
}

export class MapInfo extends Schema {
    @type({ map: ObjectState }) objects = new MapSchema<ObjectState>();
    @type("string") name:string;
}
export class MapRoomState extends Schema {
    @type({ map: MapInfo }) maps = new MapSchema<MapInfo>();
}
/* Messages */
export class MoveMessage extends Schema{
    @type("string") uID:string;
    @type("number") x:number;
    @type("number") y:number;
}

export class ShotMessage extends Schema{
    @type("number") force:number;
    @type("string") client:string;
    @type("string") room:string;

}

export class ObjectMessage extends Schema{
    @type("string") uID:string;
    @type("string") message:string;
    @type("string") room:string;
}
