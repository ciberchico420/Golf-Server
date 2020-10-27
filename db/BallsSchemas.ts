import mongoose, { Schema,Document } from 'mongoose';

const BallStatsSchema:Schema= new Schema({
    friction:{type:Number},
    size:{type:Number},
    gems:{type:Number},
});

const BallSchema:Schema= new Schema({
    name:{type:String},
    mesh:{type:String},
    stats:{type:BallStatsSchema}
});