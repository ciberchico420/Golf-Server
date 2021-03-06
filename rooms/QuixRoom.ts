import { Room, Client, Delayed } from "colyseus";
import { MapSchema, ArraySchema, DataChange } from '@colyseus/schema'

import { Worker } from 'worker_threads';
import { quixServer } from "..";
import { BoxObject, GameState, ObjectMessage, ArenaItemState, ShotMessage, UserState, V3, ObjectState } from "../schema/GameRoomState";
import { WorldInstance } from "../world2/WorldsManager";
import { map, negate } from "lodash";
import { WIBox, WISphere, WIUserState } from "../db/WorldInterfaces";
import { BoxModel, IBox, ISphere, SphereModel } from "../db/DataBaseSchemas";
import { c } from "../c";
import { Box, Vec3 } from "cannon";
import { AIPlayer_Room } from "../AI/AIPlayer";
import * as net from "net";
import PhysicsController from "./Physics/PhysicsController";


export class QuixRoom extends Room {
    public State: GameState;
    //public sWorld: SWorld;
    maxClients = 1;
    worker: Worker;
    autoDispose = true;
    initMap: string = "1000objs"
    worldInstance: WorldInstance;
    gameControl: GameControl;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        //quixServer.worldsManager.register(this);
        //this.gameControl = new GameControl(this);

        this.readMessages();

        //new PhysicsController(this);

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
    aiPlayer: AIPlayer_Room;
    theMind: WISphere;
    constructor(room: QuixRoom) {
        this.State = room.State;
        this.room = room;
        this.turnControl = new TurnControl(this);
        this.aiPlayer = new AIPlayer_Room(room);
        this.createTheMind();
    }
    onJoin(client: Client) {
        var us = new RoomUser(this, client);
        this.users.set(client.sessionId, us);
        this.turnControl.onUserJoin(us);
        return us;
    }
    createTheMind() {
        var box: WISphere = new WISphere();
        box.uID = c.uniqueId();
        box.radius = 1;
        box.type = "TheMind"
        box.mass = 0;
        box.position = c.createV3(0, 0, 0);
        this.room.worldInstance.createSphere(box, undefined, this.room)
        this.theMind = box;
    }
    onStateChange(state: any, path: string) {
        console.log("State changed in World", state, path);
        if (path == "turnState.winner") {
            this.turnControl.onWon();
        }
    }
    sendMessageToObject(uID: string, mmessage: string) {
        let message: ObjectMessage = new ObjectMessage();
        message.room = this.room.roomId;
        message.uID = uID;
        message.message = mmessage;
        this.room.worldInstance.sendMessageFromRoom("objectMessage", message, this.room.roomId, undefined);
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

    onOverWon(turnWinner: UserState) {

        this.State.turnState.turn = 0;
        let hightsGems: RoomUser;

        this.users.forEach(element => {
            if (hightsGems == undefined) {
                hightsGems = element;
            } else {
                if (element.userState.gems > hightsGems.userState.gems) {
                    hightsGems = element;
                }
            }
            element.isReady = false;
        });



        this.users.forEach(element => {
            let winner = hightsGems.userState.sessionId === element.client.sessionId ? "You" : hightsGems.userState.sessionId;
            element.client.send("error", winner + " has won!");
            element.userState.gems = 0;
            element.updateInWorld();
        });
    }


}

class TurnControl {
    room: QuixRoom;
    gameControl: GameControl
    State: GameState;
    turnWinner: UserState;
    onReadyPlanningListeners: any[] = new Array<() => {}>();
    neededWins = 3;
    constructor(gameControl: GameControl) {
        this.room = gameControl.room;
        this.gameControl = gameControl;
        this.State = gameControl.State;
        console.log("Turn control")
    }
    onUserJoin(user: RoomUser) {
        user.positionIndex = this.gameControl.users.size;
        /*Should change when released */
        if (this.gameControl.users.size == this.room.maxClients) {
            this.startPlanning();

        }
    }

    onWon() {

        this.turnWinner = this.State.users.get(this.State.turnState.winner);

        let userob = this.gameControl.users.get(this.turnWinner.sessionId);
        this.turnWinner.gems += 3 + Math.ceil(this.State.turnState.turn / 2);
        this.turnWinner.wins += 1;
        this.State.turnState.turn += 1;
        this.State.turnState.phase = 1;
        userob.updateInWorld();

        if (this.turnWinner.wins == this.neededWins) {
            this.gameControl.onOverWon(this.turnWinner);
        }
        this.gameControl.sendMessageToObject(userob.player.uID, "reset_ball");

    }
    startPlanning() {
        this.State.turnState.phase = 1;
        this.gameControl.users.forEach(us => {
            us.setShop();
            console.log("Start planning")
        })
    }
    readyPlanning(user: RoomUser) {
        // 
        this.room.broadcast("info", user.userState.sessionId + " is ready!");
        if (!user.isReady) {
            this.room.State.turnState.ready.push(user.userState.sessionId);

            if (this.room.State.turnState.ready.length == this.gameControl.users.size) {
                this.room.State.turnState.phase = 2;
                this.createBoardObjects();

                this.onReadyPlanningListeners.forEach(val => {
                    val();
                });
                this.onReadyPlanningListeners.splice(0, this.onReadyPlanningListeners.length);

                this.room.State.turnState.ready.splice(0, this.room.State.turnState.ready.length);
            }
        }
    }
    createBoardObjects() {

        this.gameControl.users.forEach(us => {
            console.log("Creating " + us.userState.board.size);
            us.userState.board.forEach((item) => {
                var box: WIBox = new WIBox();
                box.uID = item.uID;
                box.halfSize = { x: item.width, y: 1, z: item.height };
                box.instantiate = true;
                box.type = item.type;
                box.position = item.position;
                box.mesh = "Board/" + item.type

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

    notSellItemNames = ["Machine"];
    constructor(gameControl: GameControl, client: Client) {
        this.client = client;
        this.gameControl = gameControl;
        this.createPlayer();
        this.createBall();
        this.userState = new UserState();
        this.userState.sessionId = client.sessionId;
        this.gameControl.State.users.set(client.sessionId, this.userState);
        this.initGems();
        this.setStartBoardObjs();

    }
    initGems() {
        this.userState.gems = 3;
        this.updateInWorld();
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
        box.radius = 5;
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
        sphere.radius = 2;
        sphere.mass = 1;
        sphere.type = "GolfBall2";
        sphere.mesh = "Objects/Balls/Vanilla/Vanilla"
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

    setStartBoardObjs() {

        var cr2 = new ArenaItemState();
        cr2.assign({ uID: c.uniqueId(), type: "Machine", price: 0 });
        cr2.setSize(3, 2)
        cr2.setPosition(0, 0)
        // this.userState.board.set(cr2.uID, cr2);
    }

    setShop() {
        this.userState.shop = new MapSchema();
        this.createItemInShop("Monkey", 3, { x: 1, y: 1 });
        this.createItemInShop("Wall", 2, { x: 3, y: 1 });
        this.createItemInShop("Bomb", 1, { x: 1, y: 1 });
        //this.createItemInShop("Platform", 2, { x: 2, y: 1 });
    }

    buyItem(item: ArenaItemState) {
        if (this.userState.board.get(item.uID) == undefined) {
            if ((this.userState.gems - item.price) >= 0) {
                console.log("Arena item position", item.position)
                let shpitm = this.userState.shop.get(item.uID);
                let newItm = new ArenaItemState().assign(shpitm);
                this.userState.board.set(item.uID, newItm);
                const itm = this.userState.board.get(item.uID);
                this.userState.shop.delete(item.uID);
                itm.setPosition(item.position.x, item.position.y);
                this.userState.gems -= item.price;
                this.updateInWorld();
                console.log(item)
            } else {
                this.client.send("error", "Not enough gems :c");
            }
        } else {
            this.userState.board.get(item.uID).setPosition(item.position.x, item.position.y);
        }
    }
    sellItem(message: ArenaItemState) {
        if (!this.notSellItemNames.includes(message.type)) {
            if (this.userState.board.get(message.uID) != null) {
                console.log("Sell item " + message.uID);
                this.userState.gems += message.price / 2;
                this.updateInWorld();
                this.createItemInShop(message.type, message.price, { x: message.height, y: message.width });
                this.userState.board.delete(message.uID);

            }
        } else {
            this.client.send("error", "You can't sell this item.");
        }

    }

    leave() {
        this.gameControl.room.worldInstance.destroyObject(this.player);
        this.gameControl.room.worldInstance.destroyObject(this.golfBall);
    }
}