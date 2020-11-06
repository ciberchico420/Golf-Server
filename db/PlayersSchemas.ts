import mongoose, { Schema,Document } from 'mongoose';

const PlayerStatsShema:Schema= new Schema({
    str:{type:Number},
    shots:{type:Number},
    gems:{type:Number},
});
const PlayerSchema:Schema = new Schema({
    name:{type:String},
    mesh:{type:String},    
    stats:{type:PlayerStatsShema}
});
