import { Client, Room } from "colyseus";
import { c } from "../c";
import { MapModel } from "../db/DataBaseSchemas";
import { WIBox } from "../db/WorldInterfaces";
import { BoxObject, GameState, ShotMessage, SphereObject, UserState } from "../schema/GameRoomState";
import MessagesVars from "./Physics/MessagesVars";
import PhysicsController from "./Physics/PhysicsController";

export class QuixPhysicsRoom extends Room {
    State: GameState;
    maxClients = 1;
    phyController: PhysicsController;
    MapName = "arena"
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        this.phyController = new PhysicsController(this);

        this.onMessage("move", (client, message) => {
            /* var player = this.users.get(client.sessionId);
             player.move(message.x, message.y);*/
            this.phyController.Send(MessagesVars.move, { uID: message.uID, x: message.x, y: message.y })
            //console.log("move",message);
        })
        this.onMessage("jump", (client, message) => {
            /* var player = this.users.get(client.sessionId);
             player.move(message.x, message.y);*/
            this.phyController.Send(MessagesVars.Jump, {uID:message.uID});
            // console.log("move",message);
        })
        this.onMessage("shoot", (client, message) => {
            this.phyController.Send(MessagesVars.Shoot, { client: client.sessionId, force:message.force })
        })
        this.onMessage("use_Power1", (client, message) => {
            /* var player = this.users.get(client.sessionId);
             player.move(message.x, message.y);*/
            this.phyController.Send("createBoxes", {});
            // console.log("move",message);
        })
     
        
        this.onMessage("rotatePlayer", (client, message) => {
            this.phyController.Send(MessagesVars.rotatePlayer, { uID: message.uID, x: message.x, y: message.y })
        })
    }
    onDispose() {
        this.phyController.Send(MessagesVars.Close, "");
        console.log("Closing QuixPhysics connection");
    }
    OnConnectedToServer() {
        this.generateMap(this.MapName);
    }
    onJoin(client: Client, options: any) {
        let us = new UserState();
        us.sessionId = client.sessionId;
        this.State.users.set(client.sessionId, us);
        this.createPlayer(us);

    }
    generateMap(mapName: string) {
        /* MapModel.find({ name: mapName }, (err, doc) => {
             if (doc.length > 0) {
                 let map = doc[0];
                 console.log(JSON.stringify(map));*/
        this.phyController.Send("generateMap", mapName);
        /* }
     });*/
    }
    createPlayer(user: UserState) {
        var box = new SphereObject();
        box.uID = c.uniqueId();
        // box.halfSize = c.createV3(10, 10, 10);
        box.radius = 10;
        box.instantiate = true;
        box.type = "Player2"
        box.mesh = "Players/Sol/sol_prefab";
        box.quaternion = c.initializedQuat();
        box.mass = 1;
        box.position = c.createV3(0, 200, 0);
        box.owner = user.sessionId;

        // this.State.world.objects.set(box.uID,box);

        this.phyController.Send(MessagesVars.create, box);
    }
}

