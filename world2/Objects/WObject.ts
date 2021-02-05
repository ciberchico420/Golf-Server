import { ObjectMessage, ObjectState, Quat } from "../../schema/GameRoomState";
import CANNON, { Quaternion, Vec3, World } from "cannon";
import { SWorld } from "../world2";
import { WIObject } from "../../db/WorldInterfaces";

export class WObject {
    body: CANNON.Body;
    objectState: WIObject;
    uID: string;
    lastPosition: Vec3;
    lastRotation: Quaternion;
    needUpdate = false;
    world: SWorld;
    userID: string = undefined;
    roomID: string = undefined;
    hasInit: boolean = false;
    ignoreRotation = false;
    alwaysUpdate = false; // Para objetos mass 0
    lastMessageSended:ObjectMessage;

    constructor(bodyState: WIObject, body: CANNON.Body, world: SWorld) {
        this.world = world;
        this.body = body;
        this.objectState = bodyState;

        this.uID = bodyState.uID
    }

    changeMass(newMass: number) {
        this.body.mass = newMass;
        this.body.updateMassProperties();
    }
    changeCollitionResponse(bool:boolean){
        this.body.collisionResponse = bool;
    }
    firstTick() {
    }

    setPosition(x: number, y: number, z: number) {
        this.body.position = new Vec3(x, y, z);

        this.objectState.position.x = x;
        this.objectState.position.y = y;
        this.objectState.position.z = z;
    }

    setRotation(x: number, y: number, z: number) {
        var rad = 180 / Math.PI;
        this.body.quaternion.setFromEuler(x / rad, y / rad, z / rad, "ZYX")
        this.objectState.quat.x = this.body.quaternion.x;
        this.objectState.quat.y = this.body.quaternion.y;
        this.objectState.quat.z = this.body.quaternion.z;
        this.objectState.quat.w = this.body.quaternion.w;
    }

    setRotationQ(x: number, y: number, z: number, w: number) {
        this.body.quaternion.set(x, y, z, w);
        this.objectState.quat.x = this.body.quaternion.x;
        this.objectState.quat.y = this.body.quaternion.y;
        this.objectState.quat.z = this.body.quaternion.z;
        this.objectState.quat.w = this.body.quaternion.w;
    }

    getPosition(): { x: number, y: number, z: number } {
        return { x: this.body.position.x, y: this.body.position.y, z: this.body.position.z }
    }

    round(value: number, precision: number) {
        var multiplier = Math.pow(10, precision || 0);
        var res = Math.round(value * multiplier) / multiplier;
        return res;
    }

    updatePositionAndRotation() {
        var precition = 4;
        this.objectState.position.x = this.round(this.body.position.x, precition);
        this.objectState.position.y = this.round(this.body.position.y, precition);
        this.objectState.position.z = this.round(this.body.position.z, precition);

        if (!this.ignoreRotation) {
            this.objectState.quat.x = this.round(this.body.quaternion.x, precition);
            this.objectState.quat.y = this.round(this.body.quaternion.y, precition);
            this.objectState.quat.z = this.round(this.body.quaternion.z, precition);
            this.objectState.quat.w = this.round(this.body.quaternion.w, precition);
        }


        // console.log(this.objectState.position.x,this.objectState.position.y,this.objectState.position.z);
    }
    stop() {
        this.body.velocity = new Vec3(0, 0, 0);
        this.body.angularVelocity = new Vec3(0, 0, 0);
        this.body.quaternion = new Quaternion(0, 0, 0, 1);
    }
    isStatic(): boolean {
        var maxvel = 0.001;
        var xv = this.body.velocity.x < maxvel && this.body.velocity.x > -maxvel;
        var yv = this.body.velocity.y < maxvel && this.body.velocity.y > -maxvel;
        return xv && yv;
    }
    move(x: number, y: number) {

    }

    //Method called after creating vanilla and adding it to wObjecrs
    onCreated() {

    }

    sendMessage(o: ObjectMessage) {
        if(this.lastMessageSended != o){
             this.world.sendMessageToParent("objectMessage", o);
             this.lastMessageSended = o;
        }
    }
    onMessage(o:ObjectMessage){
        
    }


}