import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema'
import { SUser } from '../world/SUser';

export class V3 extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
}
export class NamedPoint extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
    @type("string") name: string = "";
}
export class Quat extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
    @type("number") w: number = 0;

}
export class EulerQuat extends Schema {
    @type(Quat) quat: Quat = new Quat();
    @type(V3) euler: V3 = new V3();
}

export class SoundState extends Schema{
    @type("number") volume: number = 0;
    @type("string") status: string = "mute";
    @type("string") soundname = "none";
    @type("string") uID:string;
}


export class UserState extends Schema {
    @type("string") sessionId: string;
    @type("string") name: string;
    @type("number") gems: number = 0;
    @type("number") gasoline: number = 0;
    @type("number") energy: number = 0;
}

export class ObjectState extends Schema {
    @type(V3) position = new V3();
    @type(Quat) quaternion = new Quat();
    @type("string") type = "object";
    @type(UserState) owner: UserState;
    @type("string") uID: string;
    @type("boolean") instantiate:boolean;
    @type("string") material:string;
    @type(SoundState) sound = new SoundState();
    @type("number") mass: number = 0;
    @type("string") mesh:string;

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

export class PowerState extends Schema {
    @type({ map: UserState }) listUsers = new MapSchema<UserState>();
    @type("number") duration = 1;
    @type("number") cost = 1;
    @type("string") UIName = "Unknow Power";
    @type("string") UIDesc = "Unknow Power";
    @type("boolean") active = false;
    @type("string") uID: string;
    @type("string") type: string;

}

export class ObstacleState extends Schema {
    @type("string") uID:string;
    @type("string") status:string = "none";
    @type("string") objectname:string = "none";
    @type(V3) position = new V3();
    @type(Quat) quaternion = new Quat();
    @type([V3]) extraPoints = new ArraySchema<V3>();
}
export class ObstacleControllerState extends Schema{
    @type("string") uID:string;
    @type("string") status:string = "none";
}

export class WorldState extends Schema {
    @type({ map: ObjectState }) objects = new MapSchema<ObjectState>();
    @type([ObjectState]) tiles = new ArraySchema<ObjectState>();
    @type([ObstacleState]) obstacles = new ArraySchema<ObstacleState>();
}

export class BagState extends Schema{
    @type([PowerState]) slots = new ArraySchema<PowerState>();
    @type([PowerState]) shop = new ArraySchema<PowerState>();
    @type(UserState) owner: UserState;
}

export class TurnPlayerState extends Schema{
    @type("number") gems = 100;
    @type("number") initialShots = 1;
    @type("number") shots = 1;
    @type("boolean") ballisMoving = false;
    @type(V3) checkpoint = new V3();
    @type(UserState) user = new UserState;
    @type(BagState) bag = new BagState();
    
    
}
export class TurnsState extends Schema {
    @type({ map: TurnPlayerState }) players = new MapSchema<TurnPlayerState>();
    @type("number") turn = 0;
    @type("number") timerToStart = 3;
    @type("number") gemsPerTurn = 3;
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
    @type(ChatState) chat = new ChatState();
}

export class MapInfo extends Schema {
    @type({ map: ObjectState }) objects = new MapSchema<ObjectState>();
    @type("string") name:string;
}
export class MapRoomState extends Schema {
    @type({ map: MapInfo }) maps = new MapSchema<MapInfo>();
}

export class MoveMessage extends Schema{
    @type("string") uID:string;
    @type("number") x:number;
    @type("number") y:number;
    @type("number") rotX:number;
    @type("number") rotZ:number;
}

export class ShotMessage extends Schema{
    @type("number") force:number;
    @type(Quat) angle:Quat;
    @type("string") client:string;
    @type("string") room:string;

}

export class ObjectMessage extends Schema{
    @type("string") uID:string;
    @type("string") message:string;
    @type("string") room:string;

}
