export class WObject{
    position:{x:number,y:number,z:number}
    quat:{x:number,y:number,z:number,w:number}
    uID:string
    halfSize:{x:number,y:number,z:number}
    radius:number
    type:string
    material:string
    instantiate:boolean;
    mass:number;
    mesh:string
}

export class WBox extends WObject{
    halfSize:{x:number,y:number,z:number}
}

export class WSphere extends WObject{
    radius:number
}