import { parentPort, workerData } from 'worker_threads';


class TSWorker {
    play:boolean = true;
    constructor(toRun: () => any) {
        
        if(toRun != undefined){
             while(this.play){
            console.log("si");         
            //parentPort.postMessage();
            
        }
        }else{
            console.log("To run not defined");
        }
       
    }
}

var tsworker = new TSWorker(workerData.toRun);