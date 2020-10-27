import mongoose, { Schema,Document } from 'mongoose';

const CharStatsShema:Schema= new Schema({
    str:{type:Number},
    shots:{type:Number},
    gems:{type:Number},
});
const CharacterSchema:Schema = new Schema({
    name:{type:String},
    mesh:{type:String},    
    stats:{type:CharStatsShema}
});
