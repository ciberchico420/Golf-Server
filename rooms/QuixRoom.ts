import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema,DataChange } from '@colyseus/schema'

import { Worker } from 'worker_threads';
import { quixServer } from "..";
import { BoxObject, GameState, ObjectMessage, ArenaItemState, ShotMessage, UserState, V3 } from "../schema/GameRoomState";
import { WorldInstance } from "../world2/WorldsManager";
import { map } from "lodash";
import { WIBox, WIUserState } from "../db/WorldInterfaces";
import { BoxModel, IBox, ISphere, SphereModel } from "../db/DataBaseSchemas";
import { c } from "../c";
import { Box, Vec3 } from "cannon";


export class QuixRoom extends Room {

    public State: GameState;
    //public sWorld: SWorld;
    maxClients = 2;
    worker: Worker;
    autoDispose = true;
    initMap: string = "arena"
    worldInstance: WorldInstance;
    gameControl: GameControl;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        quixServer.worldsManager.register(this);
        this.gameControl = new GameControl(this);

        this.readMessages();
    }
    readMessages() {
        this.gameControl.readMessages();
    }

    // When client successfully join the room
    onJoin(client: Client, options: any) {
        this.gameControl.onJoin(client);
    }
    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {

        console.log("Client " + client.sessionId + " leave");
        this.gameControl.users.get(client.sessionId).leave();
    }
    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {
        this.worldInstance.removeRoom(this);
        console.log("Quix room disposed");
    }
}

class GameControl {

    State: GameState;
    users: Map<string, RoomUser> = new Map<string, RoomUser>();
    room: QuixRoom;
    constructor(room: QuixRoom) {
        this.State = room.State;
        this.room = room;
    }
    onJoin(client: Client) {
            var us = new RoomUser(this, client);
            this.users.set(client.sessionId, us);
    }
    readMessages() {
        this.room.onMessage("move", (client, message) => {
            var player = this.users.get(client.sessionId);
            player.move(message.x, message.y, message.rotX, message.rotZ);
        })
        this.room.onMessage<ShotMessage>("shoot", (client, message) => {
            var player = this.users.get(client.sessionId);
            message.client = client.sessionId;
            message.room = this.room.roomId;
            // player.shoot(message.x, message.y, message.rotX, message.rotZ);
            this.room.worldInstance.sendMessage("shoot", message);

        })
        this.room.onMessage("rotatePlayer", (client, message:V3) => {
            var player = this.users.get(client.sessionId).player;
            if (player != undefined) {
                this.room.worldInstance.sendMessage("rotatePlayer", { user: client.sessionId, delta: message, room: this.room.roomId });
            }
        });
        this.room.onMessage("jump", (client, message) => {
            var player = this.users.get(client.sessionId);
            player.jump(message);
        })
        this.room.onMessage("use_Power1", (client, message) => {
            this.room.worldInstance.sendMessageFromRoom("use_Power1",{},this.room.roomId,client.sessionId);
        })
        this.room.onMessage("objectMessage", (client, message:ObjectMessage) => {
            this.room.worldInstance.sendMessageFromRoom("objectMessage",message,this.room.roomId,client.sessionId);
        })

        this.room.onMessage("buyItem", (client, message:ArenaItemState) => {
            var user = this.users.get(client.sessionId);
            user.buyItem(message);
        })
    }

}

export class RoomUser {
    client: Client;
    gameControl: GameControl;
    player: IBox;
    golfBall: ISphere;
    userState:UserState;
    constructor(gameControl: GameControl, client: Client) {
        this.client = client;
        this.gameControl = gameControl;
        this.createPlayer();
        this.createBall();
        this.userState = new UserState();
        //this.userState.shop = 
        this.userState.sessionId = client.sessionId;
        this.gameControl.State.users[client.sessionId] = this.userState;
        this.setShop();
    }
    onChange(onChange: any) {
       console.log(onChange);
    }
    move(x: number, y: number, rotX: number, rotZ: number) {
        this.gameControl.room.worldInstance.sendMessage("move", { x: x, y: y, rotX: rotX, rotZ: rotZ, uID: this.player.uID });
    }
    jump(message: number) {
        this.gameControl.room.worldInstance.sendMessage("jump", { isJumping: message, uID: this.player.uID });
    }
    updateInWorld(){
        var wus = new WIUserState(this.userState.sessionId);

        for(var b in wus){
            (wus as any)[b] = (this.userState as any)[b];
        }
        this.gameControl.room.worldInstance.sendMessage("updateUser", { room:this.gameControl.room.roomId,state:wus });
    }

    createPlayer() {
        var box: ISphere = new SphereModel();
        box.uID = c.uniqueId();
        //box.halfSize = c.createV3(.5, .5, .5);
        box.radius = 1;
        box.instantiate = true;
        box.type = "Player2"
        box.mesh = "Players/Sol/sol_prefab";
        box.quat = c.initializedQuat();
        box.mass = 1;
        box.material = "ballMaterial"
        box.position = c.createV3(0, 0, 0);
        this.gameControl.room.worldInstance.createSphere(box, this, this.gameControl.room)
        this.player = box;
    }

    createBall() {
        var sphere: ISphere = new SphereModel();
        sphere.uID = c.uniqueId();
        sphere.radius = 1;
        sphere.mass = 1;
        sphere.type = "GolfBall2";
        sphere.material = "ballMaterial"
        sphere.instantiate = true;

        this.gameControl.room.worldInstance.createSphere(sphere, this, this.gameControl.room);

        this.golfBall = sphere;
    }

    setShop(){
        var cr = new ArenaItemState(c.uniqueId(),"Monkey",10);
        cr.setSize(1,2)
        this.userState.shop[cr.uID] = cr;
    }

    buyItem(item:ArenaItemState){
        if(this.userState.board[item.uID] == undefined){
            if((this.userState.gems-item.price)>0){
                //Can buy
                this.userState.board[item.uID] = this.userState.shop[item.uID];
                delete this.userState.shop[item.uID];

                this.userState.gems-=item.price;
                this.updateInWorld();
                this.client.send("info", "Success");
            }else{
                this.client.send("error", "Not enough gems :c");
            }
        }else{
            this.userState.board[item.uID].position = item.position;
        }
    }

    leave() {
        this.gameControl.room.worldInstance.destroyObject(this.player);
        this.gameControl.room.worldInstance.destroyObject(this.golfBall);
    }
}