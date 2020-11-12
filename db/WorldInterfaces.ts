export class WIObject{
    position:{x:number,y:number,z:number}
    quat:{x:number,y:number,z:number,w:number}
    uID:string
    halfSize:{x:number,y:number,z:number}
    radius:number
    type:string
    material:string
    instantiate:boolean;
    mass:number;
    mesh:string;
}

export class WIUserState {
     sessionId: string;
    name: string;
   shotsAvaible = "1";
}

export class WIBox extends WIObject{
    halfSize:{x:number,y:number,z:number}
}

export class WISphere extends WIObject{
    radius:number
}