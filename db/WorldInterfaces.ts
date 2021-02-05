 const initQuat = {x:0,y:0,z:0,w:1};
const initV3 = {x:0,y:0,z:0,w:1};
export class WIObject {
    position: { x: number, y: number, z: number } = initV3;
    quat: { x: number, y: number, z: number, w: number } = initQuat;
    uID: string
    halfSize: { x: number, y: number, z: number }
    radius: number
    type: string
    material: string
    instantiate: boolean;
    mass: number;
    mesh: string;
    owner:WIUserState;
}

export class WIUserState {
    sessionId: string;
    name: string;
    gems:number = 0;
    energy:number = 0;
    constructor(sessionId:string){
        this.sessionId = sessionId;
    }
}

export class WIBox extends WIObject {
    halfSize: { x: number, y: number, z: number } = {x:0,y:0,z:0}
}

export class WISphere extends WIObject {
    radius: number = 0;
}
export class MessageToOwner {
    room: string;
    uID: string;
    message: string;
}