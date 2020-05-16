import { Room, Client, Delayed } from "colyseus";
import { GameState, UserState } from "../schema/GameRoomState";
import { MWorld } from "../world/world";
import { User } from "../schema/User";
import _ from 'lodash';
import CANNON, { Vec3, Quaternion } from 'cannon';

export class MyRoom extends Room {

  delayedInterval: Delayed;
  public world: MWorld;
  public users = new Map<string, User>();
  public State:GameState;

  spawnPosition:Vec3 = new Vec3(0, 6, -200);
  initialShots: number = 2;


  onCreate(options: any) {

    this.clock.start();

    this.setState(new GameState());
    this.State = this.state;

    this.world = new MWorld(this, this.state);

    this.onMessage("setName", (client, message) => {

      this.state.name = message;
    });
    this.onMessage("shoot", (client, message) => {
      this.users.get(client.sessionId).golfball.body.velocity = new Vec3(0,0,0);
      this.users.get(client.sessionId).golfball.body.angularVelocity = new Vec3(0,0,0);
    this.users.get(client.sessionId).golfball.body.quaternion = new Quaternion(0,0,0,1);
      this.users.get(client.sessionId).golfball.body.applyLocalImpulse(new CANNON.Vec3(
        message.x*message.force,
        (-message.y)*message.force,
        (message.z)*message.force
        ), 
        new CANNON.Vec3(0, 0, 0));
        this.ownerShoot();
       
    
    })

    this.onMessage("stop",(client,message)=>{

      this.users.get(client.sessionId).golfball.body.velocity = new Vec3(0,0,0);
      this.users.get(client.sessionId).golfball.body.angularVelocity = new Vec3(0,0,0);
      this.users.get(client.sessionId).golfball.body.quaternion = new Quaternion(0,0,0,1);
    })

    this.delayedInterval = this.clock.setInterval(() => {
      this.tick();
    }, 50);


  }

  ownerShoot(){
    if(this.State.turnState.shotsAvaible == 1){
      this.State.turnState.ownerShoot = true;
      this.State.turnState.shotsAvaible = 0;
   }else{
     this.State.turnState.shotsAvaible-=1;
   }
  }

  stopVelocity = 1;

  tick(){
    this.world.tick();
    if(this.State.turnState.ownerShoot){

      var bodyVel = this.users.get(this.State.turnState.turnOwner.sessionId).golfball.body.velocity;
      if(bodyVel.x < this.stopVelocity && bodyVel.z < this.stopVelocity && bodyVel.y <this.stopVelocity){
        this.nextTurn();
      }
    
    }
    this.checkIfBallsFalling();
  }

  checkIfBallsFalling(){
    this.users.forEach(element => {
      if(element.golfball.body.position.y < -3.5 ){
        element.golfball.setPosition(this.spawnPosition.x,this.spawnPosition.y,this.spawnPosition.z);
        if(element.userState.sessionId == this.State.turnState.turnOwner.sessionId){
          this.ownerShoot();
        }
      }
      
    });
  }

  nextTurn(){
    this.State.turnState.ownerShoot = false;
    
    
    if(this.State.turnState.turn >= this.State.turnState.turnOrder.length-1){
      this.State.turnState.turn = 0;
    }else{
      this.State.turnState.turn+=1;
    }

    this.State.turnState.turnOwner = this.users.get(this.State.turnState.turnOrder[this.State.turnState.turn]).userState;
    this.State.turnState.shotsAvaible = this.initialShots;
   //console.log();
  }
  onJoin(client: Client, options: any) {
    var us = new UserState();
    us.sessionId = client.sessionId;
    this.users.set(client.sessionId, new User(client, this,us));
    
    
    this.State.users[client.sessionId] = us;
    this.State.turnState.turnOrder.push(us.sessionId);

    if((<GameState>this.state).turnState.turnOwner == undefined){
      (<GameState>this.state).turnState.turnOwner = us;
    }


    console.log("Welcome "+client.sessionId);
  
  }

  onLeave(client: Client, consented: boolean) {

    var user = this.users.get(client.sessionId);
    delete (<GameState>this.state).world.objects[user.golfball.body.id];
    this.world.cworld.remove(user.golfball.body);
    this.State.turnState.turnOrder.splice(this.State.turnState.turnOrder.indexOf(client.id),1);

    if(this.State.turnState.turnOwner.sessionId == client.sessionId){
      this.nextTurn();
    }

  }

  onDispose() {
  }

}
