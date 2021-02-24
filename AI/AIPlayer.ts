import { QuixRoom, RoomUser } from "../rooms/QuixRoom";
import { SWorker } from "../rooms/SWorker";
import { SWorld } from "../world2/world2";
import { WorldRoom } from "../world2/WorldRoom";
import { Client } from 'colyseus';
import { c } from "../c";
import { Schema } from "@colyseus/schema";
import { ClientState, ISendOptions } from "colyseus/lib/transport/Transport";
import { IncomingMessage } from "http";
import { EventEmitter } from "@colyseus/schema/lib/events/EventEmitter";
import { ArenaItemState } from "../schema/GameRoomState";

export class AIPlayer_Room {
    interval: NodeJS.Timeout;
    roomUser: RoomUser;

    constructor(public room: QuixRoom) {
        this.interval = setTimeout(() => {

            this.init();
            clearTimeout(this.interval);
        }, 5000)

    }
    init() {
        var f = new FakeClient("fake/" + c.uniqueId());
        this.roomUser = this.room.gameControl.onJoin(f);
        console.log("Creating Fake Client")
        this.buyObjts();
        this.room.gameControl.turnControl.onReadyPlanningListeners.push(this.onReadyPlanning.bind(this));
        this.room.gameControl.turnControl.readyPlanning(this.roomUser);

    }
    onReadyPlanning() {
        this.sendMessage("Start_AI");
    }
    buyObjts(){
        
        var cr2 = new ArenaItemState();
        cr2.assign({ uID: c.uniqueId(), type: "Monkey", price: 0 });
        cr2.setSize(1, 1)
        cr2.setPosition(7, 5);

       // this.roomUser.userState.board.set(cr2.uID,cr2);
    }
    sendMessage(message:string){
        this.room.gameControl.sendMessageToObject(this.roomUser.player.uID,message);
    }
}




export class FakeClient implements Client {
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
    constructor(fakeID: string) {
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