import { QuixRoom } from "../QuixRoom";
import * as net from "net";
import { QuixPhysicsRoom } from "../QuixPhysicsRoom";
import { WIBox } from "../../db/WorldInterfaces";
import { BoxObject } from "../../schema/GameRoomState";
import { c } from "../../c";
import MessageBuffer from "./MessageBuffer";

export default class PhysicsController {
    received = new MessageBuffer("<L@>");
    constructor(public room: QuixPhysicsRoom) {
        this.connectToPhysics();
    }

    connectToPhysics() {

        let client = new net.Socket();
        client.connect(1337, '127.0.0.1', function () {
            console.log('Connected to QuixPhysics');
            client.write('Hello, server! Love, Client.');
            //client.write('<EOF>');

        });

        client.on('data', (e) => {
            this.readData(e)
        });
        client.on("error", (err) => {
            console.log(err);
        })


    }
    readData(data: Buffer) {

        this.received.push(""+data)
        
        while (!this.received.isFinished()) {
            const message = this.received.handleData()
            let json = JSON.parse(message.toString());
            if(json.type == "createBox"){
                let message = JSON.parse(json.message);
                let position = c.createV3(message.position.X,message.position.Y,message.position.Z);
                let boxState = new BoxObject().assign({halfSize:c.createV3(.5,.5,.5),
                    position:position,
                    quaternion:c.initializedQuat(),
                    type:"Box",
                    mass:1,
                    uID:message.uID
  
                });
                console.log("Create box",message);
                this.room.State.world.objects.set(message.uID,boxState);
            }
            if(json.type == "update"){
                let message = JSON.parse(json.message);
  
                for (let index = 0; index < message.length; index++) {
                    const element = message[index];
                    const position = JSON.parse(element.position);
                    this.room.State.world.objects.get(element.uID).position.x = position.X;
                    this.room.State.world.objects.get(element.uID).position.y = position.Y;
                    this.room.State.world.objects.get(element.uID).position.z = position.Z;
                   // console.log(this.room.State.world.objects.get(element.uID));
                    
                }
                
            }
        }
        // console.log("data",""+data);

        // let json = JSON.parse(data.toString());


        /*  if(json.type == "createBox"){
              let message = JSON.parse(json.message);
              let position = c.createV3(message.position.X,message.position.Y,message.position.Z);
              let boxState = new BoxObject().assign({halfSize:c.createV3(1,1,1),
                  position:c.createV3(0,0,0),
                  quaternion:c.initializedQuat(),
                  type:"Box",
                  mass:1,
                  uID:message.uID

              });
              console.log("Create box",message);
              this.room.State.world.objects.set(message.uID,boxState);
          }
          if(json.type == "update"){
              let message = JSON.parse(json.message);

              for (let index = 0; index < message.length; index++) {
                  const element = message[index];
                  const position = JSON.parse(element.position);
                  this.room.State.world.objects.get(element.uID).position.x = position.X;
                  this.room.State.world.objects.get(element.uID).position.y = position.Y;
                  this.room.State.world.objects.get(element.uID).position.z = position.Z;
                 // console.log(this.room.State.world.objects.get(element.uID));
                  
              }
              
          }*/


    }

}