
import mongoose, { Schema,Document } from 'mongoose';
import { V3 } from '../schema/GameRoomState';

 const ObjectSchema:Schema = new Schema({
    position:{type:{x:Number,y:Number,z:Number}},
    quat:{type:{x:Number,y:Number,z:Number,w:Number}},
    uID:{type:String},
    type:{type:String},
    instantiate:{type:Boolean},
    mass:{type:Number},
    mesh:{type:String},

    halfSize:{type:{x:Number,y:Number,z:Number}},
    radius:{type:Number},
})


export interface IObject extends Document{
    position:{x:number,y:number,z:number},
    quat:{x:number,y:number,z:number,w:number},
    uID:string,
    //halfSize:{x:number,y:number,z:number},
   // radius:number,
    type:string,
    instantiate:boolean;
    mass:number;
    mesh:string,
    owner:any,
}

export interface IBox extends IObject{
    halfSize:{x:number,y:number,z:number}
}

export interface ISphere extends IObject{
    radius:number
}


const MapSchema: Schema = new Schema({
     objects:  {type:[],required:true},
     name:{type:String,required:true},
     startPositions:{type:[{x:Number,y:Number,z:Number}]}
});

export interface IMap extends Document {
    name:String;
    objects:IObject[];
    startPositions:{x:number,y:number,z:number}[]
  }

export var MapModel= mongoose.model<IMap>('map', MapSchema );

export var ObjectModel =  mongoose.model<IObject>("object",ObjectSchema)
export var BoxModel =  mongoose.model<IBox>("object",ObjectSchema)
export var SphereModel =  mongoose.model<ISphere>("object",ObjectSchema)
