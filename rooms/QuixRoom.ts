import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema, DataChange } from '@colyseus/schema'

import { Worker } from 'worker_threads';
import { quixServer } from "..";
import { BoxObject, GameState, ObjectMessage, ArenaItemState, ShotMessage, UserState, V3, ObjectState } from "../schema/GameRoomState";
import { WorldInstance } from "../world2/WorldsManager";
import { map } from "lodash";
import { WIBox, WISphere, WIUserState } from "../db/WorldInterfaces";
import { BoxModel, IBox, ISphere, SphereModel } from "../db/DataBaseSchemas";
import { c } from "../c";
import { Box, Vec3 } from "cannon";
import { WorldRoom, WorldUser } from "../world2/world2";


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
    turnControl: TurnControl;
    constructor(room: QuixRoom) {
        this.State = room.State;
        this.room = room;
        this.turnControl = new TurnControl(this);
    }
    onJoin(client: Client) {
        var us = new RoomUser(this, client);
        this.users.set(client.sessionId, us);
        this.turnControl.onUserJoin(us);
    }
    readMessages() {
        this.room.onMessage("move", (client, message) => {
            var player = this.users.get(client.sessionId);
            player.move(message.x, message.y);
        })
        this.room.onMessage<ShotMessage>("shoot", (client, message) => {
            var player = this.users.get(client.sessionId);
            message.client = client.sessionId;
            message.room = this.room.roomId;
            // player.shoot(message.x, message.y, message.rotX, message.rotZ);
            this.room.worldInstance.sendMessage("shoot", message);

        })
        this.room.onMessage("rotatePlayer", (client, message: V3) => {
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
            this.room.worldInstance.sendMessageFromRoom("use_Power1", {}, this.room.roomId, client.sessionId);
        })
        this.room.onMessage("objectMessage", (client, message: ObjectMessage) => {
            this.room.worldInstance.sendMessageFromRoom("objectMessage", message, this.room.roomId, client.sessionId);
        })

        //Planning
        this.room.onMessage("buyItem", (client, message: ArenaItemState) => {
            var user = this.users.get(client.sessionId);
            user.buyItem(message);
        })

        this.room.onMessage("sellItem", (client, message: ArenaItemState) => {
            var user = this.users.get(client.sessionId);
            user.sellItem(message);
        })

        this.room.onMessage("readyPlanning", (client, message: ArenaItemState) => {
            var user = this.users.get(client.sessionId);
            this.turnControl.readyPlanning(user);
        })
    }


}

class TurnControl {
    room: QuixRoom;
    gameControl: GameControl
    State: GameState;
    rectSize: number = 50;
    board1: BoxObject;
    board2: BoxObject;
    constructor(gameControl: GameControl) {
        this.room = gameControl.room;
        this.gameControl = gameControl;
        this.State = gameControl.State;


    }
    onUserJoin(user: RoomUser) {
        user.positionIndex = this.gameControl.users.size;
        if (this.gameControl.users.size == this.room.maxClients) {
            this.startPlanning();
            this.getBoards();

        }
    }
    getBoards() {
        this.State.world.objects.forEach((obj) => {
            if (obj.type == "board1") {
                this.board1 = obj as BoxObject;
            }
            if (obj.type == "board2") {
                this.board2 = obj as BoxObject;
            }
        })
    }


    startPlanning() {
        this.State.turnState.phase = 0;
        this.gameControl.users.forEach(us => {
            us.setShop();
        })
    }
    readyPlanning(user: RoomUser) {
        // 
        this.room.broadcast("info", user.userState.sessionId + " is ready!");
        if (!user.isReady) {
            this.room.State.turnState.ready.push(user.userState.sessionId);

            if (this.room.State.turnState.ready.length == this.room.maxClients) {
                this.room.State.turnState.phase = 2;
                this.createBoardObjects();

                this.room.State.turnState.ready.splice(0,this.room.State.turnState.ready.length);
            }
        }
    }
    createBoardObjects() {
        this.gameControl.users.forEach(us => {
            us.userState.board.forEach((item) => {
                var box: WIBox = new WIBox();
                box.uID = item.uID;
                box.halfSize = { x: item.height, y: 1, z: item.width };
                box.instantiate = true;
                box.type = item.type;
                box.position = item.position;

                this.gameControl.room.worldInstance.createBox(box, us, this.gameControl.room);
            })
        })
    }
}

export class RoomUser {
    client: Client;
    gameControl: GameControl;
    player: WISphere;
    golfBall: WISphere;
    userState: UserState;
    positionIndex: number;
    isReady: boolean = false;
    constructor(gameControl: GameControl, client: Client) {
        this.client = client;
        this.gameControl = gameControl;
        this.createPlayer();
        this.createBall();
        this.userState = new UserState();
        this.userState.sessionId = client.sessionId;
        this.gameControl.State.users.set(client.sessionId, this.userState);
    }
    move(x: number, y: number) {
        this.gameControl.room.worldInstance.sendMessage("move", { x: x, y: y, uID: this.player.uID });
    }
    jump(message: number) {
        this.gameControl.room.worldInstance.sendMessage("jump", { isJumping: message, uID: this.player.uID });
    }
    updateInWorld() {
        var wus = new WIUserState(this.userState.sessionId);

        for (var b in wus) {
            (wus as any)[b] = (this.userState as any)[b];
        }
        this.gameControl.room.worldInstance.sendMessage("updateUser", { room: this.gameControl.room.roomId, state: wus });
    }

    createPlayer() {
        var box: WISphere = new WISphere();
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
        var sphere: WISphere = new WISphere();
        sphere.uID = c.uniqueId();
        sphere.radius = 1;
        sphere.mass = 1;
        sphere.type = "GolfBall2";
        sphere.material = "ballMaterial"
        sphere.instantiate = true;

        this.gameControl.room.worldInstance.createSphere(sphere, this, this.gameControl.room);

        this.golfBall = sphere;
    }
    createItemInShop(type: string, price: number, size: { x: number, y: number }) {
        var cr = new ArenaItemState();
        cr.assign({ uID: c.uniqueId(), type: type, price: price });
        cr.setSize(size.x, size.y)
        this.userState.shop.set(cr.uID, cr);
        return cr;
    }

    setShop() {
        this.createItemInShop("Monkey", 10, { x: 2, y: 7 });
        this.createItemInShop("Monkey", 10, { x: 2, y: 7 });
        this.createItemInShop("Monkey", 10, { x: 2, y: 7 });
        this.createItemInShop("Monkey", 10, { x: 1, y: 7 });
        //this.createItemInShop("Platform", 2, { x: 2, y: 1 });
    }

    buyItem(item: ArenaItemState) {
        if (this.userState.board.get(item.uID) == undefined) {
            if ((this.userState.gems - item.price) >= 0) {
                //Can buy
                this.userState.board.set(item.uID, this.userState.shop.get(item.uID));
                this.userState.shop.delete(item.uID);

                this.userState.gems -= item.price;
                this.updateInWorld();
                this.client.send("info", "Thank you for your buy!");
            } else {
                this.client.send("error", "Not enough gems :c");
            }
        } else {
            this.userState.board.get(item.uID).position = item.position;
        }
    }
    sellItem(message: ArenaItemState) {
        if (this.userState.board.get(message.uID) != null) {
            console.log("Sell item " + message.uID);
            this.userState.gems += message.price / 2;
            this.updateInWorld();
            this.createItemInShop(message.type, message.price, { x: message.height, y: message.width });
            this.userState.board.delete(message.uID);

        }
    }

    leave() {
        this.gameControl.room.worldInstance.destroyObject(this.player);
        this.gameControl.room.worldInstance.destroyObject(this.golfBall);
    }
}