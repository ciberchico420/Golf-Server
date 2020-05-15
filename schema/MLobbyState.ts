import {Schema,type,MapSchema} from '@colyseus/schema'

export class MRoom extends Schema{
    @type("string") id:string;
    @type("string") name:string;
}

export class LobbyState extends Schema{
@type({map:MRoom}) rooms= new MapSchema<MRoom>();
}