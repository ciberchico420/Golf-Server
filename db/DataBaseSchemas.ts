
import mongoose, { Schema,Document } from 'mongoose';
import { V3 } from '../schema/GameRoomState';

const ObjectSchema:Schema = new Schema({
    position:{type:{x:Number,y:Number,z:Number}},
    quat:{type:{x:Number,y:Number,z:Number,w:Number}},
    uID:{type:String},
    halfSize:{type:{x:Number,y:Number,z:Number}},
    radius:{type:Number},
    verts:{type:[{x:Number,y:Number,z:Number}]},
    faces:{type:[Number]},
    type:{type:String},
    material:{type:String}
})

const TileSchema:Schema = new Schema({
    position:{type:{x:Number,y:Number,z:Number}},
    quat:{type:{x:Number,y:Number,z:Number,w:Number}},
    tile:{type:Number},
})

export interface IObject extends Document{
    position:{x:number,y:number,z:number},
    quat:{x:number,y:number,z:number,w:number},
    uID:string,
    halfSize:{x:number,y:number,z:number},
    radius:number,
    type:string,
    material:string,
}
export interface ITile extends Document{
    position:{x:number,y:number,z:number},
    quat:{x:number,y:number,z:number,w:number},
    tile:number,
}

export interface IBox extends IObject{
    halfSize:{x:number,y:number,z:number}
}
export interface ISphere extends IObject{
    radius:number
}
export interface IPoly extends IObject{
    verts:Array<{x:number,y:number,z:number}>,
    faces:Array<number>
}


const MapSchema: Schema = new Schema({
     objects:  {type:[],required:true},
     tiles:  {type:[],required:true},
     name:{type:String,required:true},
     ballspawn:{type:{x:Number,y:Number,z:Number}}
});

export interface IMap extends Document {
    name:String;
    objects:IObject[];
    tiles:ITile[];
    ballspawn:{x:number,y:number,z:number}
  }

export var MapModel= mongoose.model<IMap>('map', MapSchema );
export var TileModel =  mongoose.model<ITile>("tile",TileSchema)

export var ObjectModel =  mongoose.model<IObject>("object",ObjectSchema)
export var BoxModel =  mongoose.model<IBox>("object",ObjectSchema)
export var SphereModel =  mongoose.model<ISphere>("object",ObjectSchema)
export var PolyModel =  mongoose.model<IPoly>("object",ObjectSchema)