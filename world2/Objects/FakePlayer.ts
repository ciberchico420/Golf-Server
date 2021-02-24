import { c } from "../../c";
import { ObjectMessage, ShotMessage } from "../../schema/GameRoomState";
import { Player2 } from "./Player2";

class FakePlayerTree{
    isPlanning_bool: boolean = false;
    static maxDificulty = 10;
    dificulty = 6;
    interestingPoint: any;
    constructor(public obj: Player2) {


       // this.shootBall_Waiter = new Waiter(1000);

    }
    onMessage(o: ObjectMessage) {
        if (o.message == "Start_AI") {
      
        }
    }


    
    async shoot() {

        if (true) {
            let maxforce = 8;

            let sm = new ShotMessage();
            let dis = this.obj.distancesWith(this.interestingPoint);
            let df = (FakePlayerTree.maxDificulty - this.dificulty) * 1.5
            let rand = c.getRandomNumber(-df, df);
            let force = (dis / 105 + rand);



            force = Math.abs(Math.ceil(force));
            force = force <= 0 ? 1 : force;

            force = force > maxforce ? maxforce : force;
           // console.log("Force", force)
            sm.assign({ force: force, client: this.obj.objectState.owner.sessionId, room: this.obj.room.uID });


            this.obj.shootBall(sm)



        }
        //console.log("Shoooting")
        
    }
}
