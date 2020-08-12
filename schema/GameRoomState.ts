import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'
import { SUser } from './User';

export class V3 extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") z: number;
}
export class Quat extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") z: number;
    @type("number") w: number;

}


export class UserState extends Schema {
    @type("string") sessionId: string;
    @type("string") name: string;
    @type("string") shotsAvaible = "1";
}

export class ObjectState extends Schema {
    @type(V3) position = new V3();
    @type(Quat) quaternion = new Quat();
    @type("string") type = "object";
    @type(UserState) owner: UserState;
    @type("string") uID: string;
    @type("boolean") instantiate = true;
    @type("string") material:string;
}

export class SphereObject extends ObjectState {
    @type("number") radius: number;
}
export class PolyObject extends ObjectState {
    @type([V3]) verts = new ArraySchema<V3>();
    @type([V3]) normals = new ArraySchema<V3>();
    @type(["number"]) faces = new ArraySchema<number>();
}
export class BoxObject extends ObjectState {
    @type(V3) halfSize = new V3();
}

export class Power extends ObjectState {
    @type({ map: UserState }) listUsers = new MapSchema<UserState>();
    @type("number") turns = 1;
    @type("string") UIName = "Unknow Power";
    @type("string") UIDesc = "Unknow Power";

}

export class BagState extends Schema {
    @type({ map: Power }) objects = new MapSchema<Power>();
    @type({ map: Power }) active = new MapSchema<Power>();
    @type(UserState) owner: UserState;
}
export class WorldState extends Schema {
    @type({ map: ObjectState }) objects = new MapSchema<ObjectState>();
    @type([ObjectState]) tiles = new ArraySchema<ObjectState>();
}

export class TurnPlayerState extends Schema{
    @type("number") shots = 2;
    @type("boolean") ballisMoving = false;
    @type(V3) checkpoint = new V3();
    @type(UserState) user = new UserState;
}
export class TurnsState extends Schema {
    @type({ map: TurnPlayerState }) players = new MapSchema<TurnPlayerState>();
    @type("number") turn = 0;
    @type("number") timerToStart = 3;
}


export class Message extends Schema {
    @type(UserState) user: UserState;
    @type("string") message: string;
}
export class ChatState extends Schema {
    @type([Message]) messages = new ArraySchema<Message>();
}




export class GameState extends Schema {
    @type(WorldState) world = new WorldState();
    @type({ map: UserState }) users = new MapSchema<UserState>();
    @type(UserState) winner: UserState;
    @type("string") name: string;
    @type("string") mapName: string;
    @type(TurnsState) turnState = new TurnsState();
    @type({ map: BagState }) bags = new MapSchema<BagState>();
    @type(ChatState) chat = new ChatState();
}

export class MapInfo extends Schema {
    @type({ map: ObjectState }) objects = new MapSchema<ObjectState>();
}
export class MapRoomState extends Schema {
    @type({ map: MapInfo }) maps = new MapSchema<MapInfo>();
}


