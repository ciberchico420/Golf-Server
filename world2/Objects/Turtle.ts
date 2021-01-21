import { BoxObject, ObjectState } from "../../schema/GameRoomState";
import { WObject } from "./WObject";
import { SWorld } from "../world2";
import { WorldRunner } from "../WorldRunner";
import { Player2 } from "./Player2";
import { WIBox } from "../../db/WorldInterfaces";
import CANNON from 'cannon'

export class Turtle extends WObject {
    turtles: Map<string, WObject> = new Map();
    savedPosition: { x: number, y: number, z: number };

    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);

    }
    firstTick() {
        this.savedPosition = this.getPosition();
        this.setPosition(-3000, -3000, -3000)


        this.world.worldRooms.forEach((val) => {
            var state: WIBox = new WIBox();
            state.mesh = this.objectState.mesh;
            state.type = "LilTurtle"
            state.halfSize = (this.objectState as BoxObject).halfSize;
            state.instantiate = true;
            state.mass = 1;
            state.position = this.savedPosition;
            var lilturtle: LilTurtle = val.createObject(state, null) as LilTurtle;
            //lilturtle.body.collisionResponse = false;
            lilturtle.setRotation(-90, 0, 0);

            lilturtle.body.addEventListener("collide", (e: any) => {

                var bo = this.world.getWObjectByBodyID(e.body.id);

                var player: Player2;
                if (bo instanceof Player2) {
                    player = bo;
                    lilturtle.addToPlayer(bo);
                }
                if (bo.objectState.type == "hitBox") {
                    player = val.users.get(bo.objectState.owner.sessionId).player;
                    lilturtle.addToPlayer(player);
                }


            })

            this.turtles.set(val.uID, lilturtle);
        })
    }
}

export class LilTurtle extends WObject {
    over: Player2;
    canAttachAgain = true;
    runner: WorldRunner;
    constrain:CANNON.LockConstraint;
    constructor(bodyState: ObjectState, body: CANNON.Body, world: SWorld) {
        super(bodyState, body, world);
    }
    firstTick() {
        console.log("Hola from inside")
       this.runner = new WorldRunner(this.world)

    }
    addToPlayer(player: Player2) {
        if (player != this.over) {
            this.canAttachAgain = false;
            console.log("Turtle got hit by new hitbox")
            this.changeCollitionResponse(false);
            var playerpos = player.getPosition();
            this.setPosition(playerpos.x, playerpos.y + 50, playerpos.z);
            var c = new CANNON.LockConstraint(this.body, player.hitBox.body, { maxForce: 1000 });

            if(this.constrain != undefined){
                this.world.cworld.removeConstraint(this.constrain);
            }
            this.constrain = c;

            this.world.cworld.addConstraint(c);
            if(this.over != undefined){
                this.over.user.gems -= 100;
                this.over.user.updateGems()
            }
           
            this.over = player;
            player.user.gems += 100;
            player.user.updateGems()
            this.runner.setTimeout(()=>{
                this.canAttachAgain = true;
            },5000)
        }




        /* bo.user.gems+=100;
         bo.user.updateGems();*/
    }
}