import https from "https";
import express from "express";
import cors from "cors";
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



var database = new DataBase();
database.test();

const port = Number(process.env.PORT || 6017);
const app = express()
var mapsRoom: MapsRoom;
var lobbyRoom: Room<LobbyState>;

app.use(cors());
app.use(express.json())

const server = https.createServer(app);
const gameServer = new Server({

  server,
});



// register your room handlers
gameServer.define("Lobby", MLobbyRoom)
  .on("create", (room) => {
    lobbyRoom = room;

    lobbyRoom.autoDispose = false;

  });


gameServer.define('GameRoom', GameRoom).on("create", (room: GameRoom) => {
  var newroom = new MRoom();
  newroom.id = room.roomId;
  newroom.name = room.state.name;
  lobbyRoom.state.rooms[room.roomId] = newroom;
}).on("dispose", (room: Room<GameState>) => {
  console.log("GameRoom disposed")
  delete lobbyRoom.state.rooms[room.roomId]
});

gameServer.define("MapsRoom", MapsRoom).on("create", (room: MapsRoom) => {
  mapsRoom = room;
  room.autoDispose = false;
});



createLobbyRoom();
async function createLobbyRoom() {
  var mak = await matchMaker.createRoom("Lobby", null);
  await matchMaker.createRoom("MapsRoom", null);


}


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
console.log(`Golf-server v.1 is connected to ws://localhost:${port}`)
