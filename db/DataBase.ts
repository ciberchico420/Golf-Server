import mongoose, { Schema } from 'mongoose';
import { MapModel,  ObjectModel, IObject, IMap } from './DataBaseSchemas';
export class DataBase {
    constructor() {
        //Set up default mongoose connection
        var mongoDB = 'mongodb://localhost/golf';
        mongoose.connect(mongoDB, { useNewUrlParser: true,useUnifiedTopology: true });
        // Get Mongoose to use the global promise library
        mongoose.Promise = global.Promise;
        //Get the default connection
        var db = mongoose.connection;

        console.log("Connected to DataBase");

        //Bind connection to error event (to get notification of connection errors)
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    }

    test(){
       //
    }
}