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
import {WorldsManager } from "./world2/WorldsManager";

export class QuixServer {
  database = new DataBase();
  port = Number(process.env.PORT || 6017);
  app = express()
  version = process.env.npm_package_version;
  rooms: Map<string, Room> = new Map<string, Room>();
  server: http.Server;
  localhost: boolean = true;
  mapsRoom: MapsRoom;
  worldsManager:WorldsManager;
  matchmaker = matchMaker;
  constructor() {
    this.createWorldManager();
  }

  async connect() {
    if (this.localhost) {
      this.server = http.createServer(this.app);
    } else {
      const options = {
        key: fs.readFileSync('/etc/letsencrypt/live/drokt.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/drokt.com/cert.pem')
      };
      this.server = https.createServer(options, this.app);
    }

    this.app.use(cors());
    this.app.use(express.json())
    this.app.use("/colyseus", monitor());

    var gameServer = new Server({
      server: this.server
    });
    gameServer.define('GameRoom', QuixRoom).on("create", (room: GameRoom) => {
      //rooms.set(room.roomId,room);
    }).on("dispose", (room: Room<GameState>) => {
    });

    gameServer.define("MapsRoom", MapsRoom).on("create", (room: MapsRoom) => {
      this.mapsRoom = room;
      room.autoDispose = false;
    });


   // var mak = await matchMaker.createRoom("Lobby", null);
    await matchMaker.createRoom("MapsRoom", null);
    console.log("Maps Room initialized");

    gameServer.listen(this.port);
    if (this.localhost) {
      console.log(`Golf-server v.${this.version} is connected to ws://localhost:${this.port}`)
    } else {
      console.log(`Golf-server v.${this.version} is connected to wss://drokt.com:${this.port}`)
    }
  }

  createWorldManager(){
    this.worldsManager = new WorldsManager(this);
  }

}

export var quixServer = new QuixServer();
quixServer.connect();


