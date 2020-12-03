import { Vec3 } from "cannon";
import { WIObject, WISphere } from "../../../db/WorldInterfaces";
import { WorldRunner } from "../../WorldRunner";
import { Power2 } from "./Power2";

export class GenericFireBall extends Power2{
    runner:WorldRunner;

    throw(){
        this.runner = new WorldRunner(this.world);
        this.setPosition(this.owner.player.hitBox.body.position.x,this.owner.player.hitBox.body.position.y+(this.owner.player.playerSize.y/2),this.owner.player.hitBox.body.position.z);
        this.runner.setTimeout(()=>{
            this.world.deleteObject(this);
        },1000);

        //this.body.applyLocalImpulse(new Vec3(1,0,1),new Vec3(0,0,0));
        var euler = new Vec3();
        this.owner.player.hitBox.body.quaternion.toEuler(euler);

        this.moveVelocity = 100;
        this.body.velocity.x = -(Math.cos(euler.y)*this.moveVelocity);
        this.body.velocity.z = Math.sin(euler.y)*this.moveVelocity;
        
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