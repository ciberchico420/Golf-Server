import { Client, Room } from "colyseus";
import { c } from "../c";
import { WIBox } from "../db/WorldInterfaces";
import { BoxObject, GameState, UserState } from "../schema/GameRoomState";
import MessagesVars from "./Physics/MessagesVars";
import PhysicsController from "./Physics/PhysicsController";

export class QuixPhysicsRoom extends Room {
    State: GameState;
    maxClients = 1;
    phyController: PhysicsController;
    onCreate(options: any) {
        this.clock.start();
        this.setState(new GameState());
        this.State = this.state;
        this.phyController = new PhysicsController(this);

        this.onMessage("move", (client, message) => {
           /* var player = this.users.get(client.sessionId);
            player.move(message.x, message.y);*/
            this.phyController.Send(MessagesVars.move,{uID:message.uID,x:message.x,y:message.y})
            //console.log("move",message);
        })
        this.onMessage("jump", (client, message) => {
            /* var player = this.users.get(client.sessionId);
             player.move(message.x, message.y);*/
             this.phyController.Send(MessagesVars.createBoxes,{})
            // console.log("move",message);
         })
        this.onMessage("rotatePlayer",(client,message)=>{
            console.log("rotate",message);
        })
    }
    onDispose(){
        this.phyController.Send("Close","");
        console.log("Closing QuixPhysics connection");
    }
    OnConnected(){
     
    }
    onJoin(client: Client, options: any){
        let us = new UserState();
        us.sessionId = client.sessionId;
       // console.log(us.sessionId);
        this.State.users.set(client.sessionId,us);

         //setTimeout(()=>{
            this.createPlayer(us); 
        // },100)
       // t
    }
    createPlayer(user:UserState) {
        var box: BoxObject = new BoxObject();
        box.uID = c.uniqueId();
        box.halfSize = c.createV3(10, 10, 10);
        box.instantiate = true;
        box.type = "Player2"
        box.mesh = "Players/Sol/sol_prefab";
        box.quaternion = c.initializedQuat();
        box.mass = 1;
        box.position = c.createV3(0, 10, 0);
        box.owner = user.sessionId;

       // this.State.world.objects.set(box.uID,box);

        this.phyController.Send(MessagesVars.create,box);
    }
}

