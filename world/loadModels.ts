import fs from 'fs';
import CANNON, { ConvexPolyhedron, Vec3 } from 'cannon';
import { PolyObject, V3 } from '../schema/GameRoomState';
import { SObject } from './SObject';
import {ArraySchema } from '@colyseus/schema'
import { MapModel, IPoly } from '../db/DataBaseSchemas';

export class ModelsLoader {
    constructor() {
        
    }

    loadModel(obj:IPoly){
        //Cambiar que se busque por nombre del modelo
        var verts:Vec3[] = new Array<Vec3>();
        var Sverts:V3[] = new Array<V3>();
        var faces:number[][] = new Array<Array<number>>();

        var verts2:Number[] = new Array<Number>();
        var faces2:Number[] = new Array<Number>();

        obj.verts.forEach(e=>{
            verts.push(new Vec3(e.x,e.y,e.z));
            verts2.push(e.x);
            verts2.push(e.y);
            verts2.push(e.z);
        })


        for (let index = 0; index < obj.faces.length; index+=3) {
            const x = obj.faces[index];
            const y = obj.faces[index+1];
            const z = obj.faces[index+2];
            faces.push([x,y,z]);
            faces2.push(x);
            faces2.push(y);
            faces2.push(z);
        }
        var object = new PolyObject();
        for (var a = 0; a < verts.length; a++) {
            var v3:V3 = new V3();
            v3.x = verts[a].x;
            v3.y = verts[a].y;
            v3.z = verts[a].z;
            object.verts.push(v3);
        }
        for (var a = 0; a < faces.length; a++) {
            var v3 = new V3();
            v3.x = faces[a][0];
            v3.y = faces[a][1];
            v3.z = faces[a][2];
            object.faces.push(v3.x);
            object.faces.push(v3.y);
            object.faces.push(v3.z);
        }

        object.type ="poly";
        var gg = new CANNON.Trimesh(verts2,faces2)
        //var shape = new ConvexPolyhedron(verts,faces);
        var body = new CANNON.Body({ mass: 0 });
        body.addShape(gg);

        var sObj = new SObject(object,body,null);

        return sObj;
    }
    


}