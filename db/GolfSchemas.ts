
import mongoose, { Schema,Document } from 'mongoose';
const ObjectSchema:Schema = new Schema({
    position:{type:{x:Number,y:Number,z:Number}},
    quat:{type:{x:Number,y:Number,z:Number,w:Number}},
    uID:{type:String},
    halfSize:{type:{x:Number,y:Number,z:Number}},
    radius:{type:Number},
    type:{type:String}
})

export interface IObject extends Document{
    position:{x:number,y:number,z:number},
    quat:{x:number,y:number,z:number,w:number},
    uID:string
    halfSize:{x:number,y:number,z:number},
    radius:number,
    type:string,
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
     ballspawn:{type:{x:Number,y:Number,z:Number}}
});

export interface IMap extends Document {
    name:String;
    objects:IObject[];
    ballspawn:{x:number,y:number,z:number}
  }

export var MapModel= mongoose.model<IMap>('map', MapSchema );
export var ObjectModel =  mongoose.model<IObject>("object",ObjectSchema)
export var BoxModel =  mongoose.model<IBox>("object",ObjectSchema)