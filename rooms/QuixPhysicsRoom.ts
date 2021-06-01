import { Client, Room } from "colyseus";
import { c } from "../c";
import { MapModel } from "../db/DataBaseSchemas";
import { WIBox } from "../db/WorldInterfaces";
import { BoxObject, GameState, GauntletMessage, ShotMessage, SphereObject, SwipeMessage, UserState } from "../schema/GameRoomState";
import MessagesVars from "./Physics/MessagesVars";
import PhysicsController from "./Physics/PhysicsController";

export class QuixPhysicsRoom extends Room {
    State: GameState;
    maxClients = 100;
    phyController: PhysicsController;
    MapName = "CrocoLoco"
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        this.phyController = new PhysicsController(this);

        this.onMessage("move", (client, message) => {
            /* var player = this.users.get(client.sessionId);
             player.move(message.x, message.y);*/
            this.phyController.Send(MessagesVars.move, { client: client.sessionId, x: message.x, y: message.y })
            //console.log("move",message);
        })
        this.onMessage("jump", (client, message) => {
            /* var player = this.users.get(client.sessionId);
             player.move(message.x, message.y);*/
            this.phyController.Send(MessagesVars.Jump, { client: client.sessionId });
            // console.log("move",message);
        })
        this.onMessage("shoot", (client, message) => {
            this.phyController.Send(MessagesVars.Shoot, { client: client.sessionId, force: message.force })
        })
        this.onMessage("gauntlet", (client, message:GauntletMessage) => {
            this.phyController.Send(MessagesVars.gauntlet, { client: client.sessionId,active:message.active });
            // console.log("move",message);
        })
        this.onMessage("swipe", (client, message:SwipeMessage) => {
            this.phyController.Send(MessagesVars.Swipe, { client: client.sessionId, degree:message.degree })
        })


        this.onMessage("rotatePlayer", (client, message) => {
            this.phyController.Send(MessagesVars.rotatePlayer, { client: client.sessionId, x: message.x, y: message.y })
        })
    }
    onDispose() {
        this.phyController.Send(MessagesVars.Close, "");
        console.log("Closing QuixPhysics connection");
    }
    OnConnectedToServer() {
        if (this.clients.length == 0)
           this.generateMap(this.MapName);
    }
    timeout(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async OnDisconnectedFromServer() {
        console.log("Disconnected from physerver")
        this.clients.forEach(client => {
            console.log("Disconected a user")
            //client.leave(1,"Server has been closed");
        });

    }
    onJoin(client: Client, options: any) {
        let us = new UserState();
        us.sessionId = client.sessionId;
        // this.clients.push(client);
        this.State.users.set(client.sessionId, us);
        this.createPlayer(us);

    }
    generateMap(mapName: string) {
        this.phyController.Send("generateMap", mapName);
    }
    createPlayer(user: UserState) {
        var box = new SphereObject();
        //box.uID = c.uniqueId();
        // box.halfSize = c.createV3(10, 10, 10);
        box.radius = 10;
        box.instantiate = true;
        box.type = "Player2"
        box.mesh = "Players/Sol/sol_prefab";
        box.quaternion = c.initializedQuat();
        box.mass = 30;
        box.position = c.createV3(2258, 1137, -545);
        box.owner = user.sessionId;

        // this.State.world.objects.set(box.uID,box);

        this.phyController.Send(MessagesVars.create, box);
    }
}

