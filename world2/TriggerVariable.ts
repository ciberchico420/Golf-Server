export default class TriggerVariable{
    variable:any;
    triggered:boolean = false;
    constructor(variable:any){
        this.variable = variable;
    }

    /*if this returns true it means that the variable has changed*/
    trigger(newVar:any):boolean{
        if(newVar !== this.variable){
            this.variable = newVar;
            return true;
        }else{
            return false;
        }
    }
}