import { QuixRoom, RoomUser } from "../rooms/QuixRoom";
import { SWorker } from "../rooms/SWorker";
import { SWorld } from "../world2/world2";
import { WorldRoom } from "../world2/WorldRoom";
import {Client} from 'colyseus';
import { c } from "../c";
import { Schema } from "@colyseus/schema";
import { ClientState, ISendOptions } from "colyseus/lib/transport/Transport";
import { IncomingMessage } from "http";
import { EventEmitter } from "@colyseus/schema/lib/events/EventEmitter";

export class AIPlayer{
    interval:NodeJS.Timeout;
    constructor(public room:QuixRoom){
        this.interval = setTimeout(()=>{

            var f = new FakeClient("fake/"+c.uniqueId());
            this.room.onJoin(f,undefined);
        },5000)
     
    }
}




export class FakeClient implements Client{
    readyState: number;
    id: string;
    sessionId: string;
    state: ClientState;
    ref: any;
    upgradeReq?: IncomingMessage;
    userData?: any;
    auth?: any;
    pingCount?: number;
    _enqueuedMessages?: any[];
    constructor(fakeID:string){
        this.sessionId = fakeID;
    }
    raw(data: ArrayLike<number>, options?: ISendOptions): void {
        
    }
    enqueueRaw(data: ArrayLike<number>, options?: ISendOptions): void {
        
    }
    send(type: string | number, message?: any, options?: ISendOptions): void;
    send(message: Schema, options?: ISendOptions): void;
    send(type: any, message?: any, options?: any) {

    }
    error(code: number, message?: string): void {
  
    }
    leave(code?: number, data?: string): void {
     
    }
    close(code?: number, data?: string): void {
        
    }

}