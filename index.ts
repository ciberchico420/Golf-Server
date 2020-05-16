import http from "http";
import express from "express";
import cors from "cors";
import { Server, LobbyRoom, matchMaker, Room } from "colyseus";
import { monitor } from "@colyseus/monitor";
// import socialRoutes from "@colyseus/social/express"

import { MyRoom } from "./rooms/GameRoom";
import { MLobbyRoom } from "./rooms/MLobbyRoom";
import { LobbyState, MRoom } from "./schema/MLobbyState";
import { RoomListingData } from "colyseus/lib/matchmaker/drivers/Driver";
import { join } from "colyseus/lib/MatchMaker";
import { GameState } from "./schema/GameRoomState";



const port = Number(process.env.PORT || 6017);
const app = express()

app.use(cors());
app.use(express.json())

const server = http.createServer(app);
const gameServer = new Server({

  server,
});

var lobbyRoom: Room<LobbyState>;

// register your room handlers
gameServer.define("Lobby", MLobbyRoom)
  .on("create", (room) => {
    lobbyRoom = room;
    
    lobbyRoom.autoDispose = false;

  });


gameServer.define('GameRoom', MyRoom).on("create", (room: Room<GameState>) => {
  var newroom = new MRoom();
  newroom.id = room.roomId;
  newroom.name = room.state.name;
  lobbyRoom.state.rooms[room.roomId] = newroom;


  console.log("New room added " + room);

}).on("dispose",(room:Room<GameState>)=>{
  console.log("GameRoom disposed")
  delete lobbyRoom.state.rooms[room.roomId]
});



createLobbyRoom();
async function createLobbyRoom() {
 var mak =  await matchMaker.createRoom("Lobby", null);

 
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
