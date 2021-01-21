import { Vec3 } from "cannon";
import { Player2 } from "..";
import { WIObject, WISphere } from "../../../db/WorldInterfaces";
import { WorldRunner } from "../../WorldRunner";
import { Power2 } from "./Power2";

export class GenericFireBall extends Power2{
    runner:WorldRunner;
    deleted:boolean = false;
    moveVelocity = 200;

    throw(){
        this.runner = new WorldRunner(this.world);
        this.setPosition(this.owner.player.hitBox.body.position.x,this.owner.player.hitBox.body.position.y+(this.owner.player.playerSize.y/2),this.owner.player.hitBox.body.position.z);
        this.runner.setTimeout(()=>{
            if(!this.deleted){
              this.world.deleteObject(this);
            }
            
        },1000);

        //this.body.applyLocalImpulse(new Vec3(1,0,1),new Vec3(0,0,0));
        var euler = new Vec3();
        this.owner.player.hitBox.body.quaternion.toEuler(euler);
        this.body.velocity.x = -(Math.cos(euler.y)*this.moveVelocity);
        this.body.velocity.z = Math.sin(euler.y)*this.moveVelocity;
        this.body.addEventListener("collide",(e:any)=>{this.onCollide(e)})
        
    }
    onCollide(e: any) {
       
        if(e.body != this.owner.player.hitBox.body){
            var room = this.world.getWorldRoom(this.roomID);
            var userTarget =room.findUserByHitBox(e.body)
            if(userTarget != undefined){
                 userTarget.player.receiveDamage(this.calcDamage(userTarget.player));
            }
           
            this.runner.setTimeout(()=>{
                this.world.deleteObject(this);
                 this.deleted = true;
             },1);
             
        }

    }
    private rotNormalized:Vec3;
    private eulerRotation:Vec3;
    static createWIObject():WISphere{
        var w = new WISphere();
        w.type = "GenericFireBall"
        w.instantiate = true;
        w.radius = 5;
        return w;

    }
}