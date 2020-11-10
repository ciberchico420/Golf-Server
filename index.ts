import https from "https";
import http from "http";
import express from "express";
import cors from "cors";
const fs = require('fs');
import { Server, LobbyRoom, matchMaker, Room } from "colyseus";
import { monitor } from "@colyseus/monitor";
// import socialRoutes from "@colyseus/social/express"

import { GameRoom } from "./rooms/GameRoom";
import { MLobbyRoom } from "./rooms/MLobbyRoom";
import { LobbyState, MRoom } from "./schema/MLobbyState";
import { RoomListingData } from "colyseus/lib/matchmaker/drivers/Driver";
import { join } from "colyseus/lib/MatchMaker";
import { GameState } from "./schema/GameRoomState";
import { MapsRoom } from "./rooms/MapsRoom";
import { DataBase } from "./db/DataBase";
import { ModelsLoader } from "./world/loadModels";
import { SWorld } from "./world2/world2";
import { QuixRoom } from "./rooms/QuixRoom";



var database = new DataBase();
database.test();

const port = Number(process.env.PORT || 6017);
const app = express()
const version = process.env.npm_package_version;
var mapsRoom: MapsRoom;
var lobbyRoom: Room<LobbyState>;

var localhost = true;

export var rooms:Map<string,Room>  = new Map<string,Room>();

app.use(cors());
app.use(express.json())
app.use("/colyseus", monitor());

var server;
if(localhost){
    server= http.createServer(app);
}else{
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/drokt.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/drokt.com/cert.pem')
  };
    server = https.createServer(options,app);
}

const gameServer = new Server({
  server,
});




// register your room handlers
gameServer.define("Lobby", MLobbyRoom)
  .on("create", (room) => {
    lobbyRoom = room;

    lobbyRoom.autoDispose = false;

  });


gameServer.define('GameRoom', QuixRoom).on("create", (room: GameRoom) => {
  rooms.set(room.roomId,room);
}).on("dispose", (room: Room<GameState>) => {
});

gameServer.define("MapsRoom", MapsRoom).on("create", (room: MapsRoom) => {
  mapsRoom = room;
  room.autoDispose = false;
});


/*
createLobbyRoom();
async function createLobbyRoom() {
  var mak = await matchMaker.createRoom("Lobby", null);
  await matchMaker.createRoom("MapsRoom", null);


}
*/

/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);

// register colyseus monitor AFTER registering your room handlers
//app.use("/colyseus", monitor());

gameServer.listen(port);
if(localhost){
  console.log(`Golf-server v.${version} is connected to ws://localhost:${port}`)
}else{
  console.log(`Golf-server v.${version} is connected to wss://drokt.com:${port}`)
}

//export var sWorld:SWorld = new SWorld();

