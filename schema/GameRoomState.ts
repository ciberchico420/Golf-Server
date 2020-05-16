import {Schema,type,MapSchema,ArraySchema} from '@colyseus/schema'
import { User } from './User';

export class V3 extends Schema{
    @type("number") x:Number;
    @type("number") y:Number;
    @type("number") z:Number;
}
export class Quat extends Schema{
    @type("number") x:Number;
    @type("number") y:Number;
    @type("number") z:Number;
    @type("number") w:Number;

}


export class UserState extends Schema{
    @type("string") sessionId:string;
    @type("string") name:string;
}

export class ObjectState extends Schema{
    @type(V3) position = new V3();
    @type(Quat) quaternion = new Quat();
    @type("string") type="object";
    @type(UserState) owner:UserState;
}
export class SphereObject extends ObjectState{
    @type("number") radius:number;   
}
export class BoxObject extends ObjectState{
    @type(V3) halfSize =new V3();
}


export class WorldState extends Schema{
@type({map:ObjectState}) objects = new MapSchema<ObjectState>();
}

export class TurnsState extends Schema{
    @type("number") turn=0;
    @type(UserState) turnOwner:UserState;
    @type("boolean") ownerShoot = false;
    @type("number") shotsAvaible = 2;
    @type(["string"]) turnOrder = new ArraySchema();
}


export class GameState extends Schema{
@type(WorldState) world = new WorldState();
@type({map:UserState}) users = new MapSchema<UserState>();
@type(UserState) winner:UserState;
@type("string") name:string;
@type(TurnsState) turnState = new TurnsState();
}

