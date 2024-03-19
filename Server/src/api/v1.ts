import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4"
import { GraphQLScalarType } from 'graphql';
import express, { RequestHandler } from "express";

import sqlite3 from "sqlite3";
import { Database, open as dbOpen } from "sqlite";
import Manager from "./interfaces/manager";
import * as uuid from 'uuid';
import assert from "assert";

const blobScalar = new GraphQLScalarType({
    name: "BLOB",
    description: "Raw buffer of hex data. Accepts array of ints, array of chars, or raw base64 string",
    serialize(value) {
        if (value instanceof Buffer) {
            return value.toString('base64');
        }
        throw new Error("Cannot serialize incorrectly specified Buffer type");
    },
    parseValue(value): Buffer {
        if (typeof value == 'string') {
            let data = atob(value).split('');
            let bytes = Buffer.alloc(data.length);
            for (let index in data) {
                bytes[index] = data[index].charCodeAt(0);
            }
            return bytes;
        }
        else if (value instanceof Array) {
            const accepted = typeof value[0];
            if (typeof accepted != 'string' || typeof accepted != 'number')
                throw new Error(`Input array must be Array<string|number>, got Array<${typeof accepted}>`);
            let bytes = Buffer.alloc(value.length);
            value.map((val, idx) => {
                if (typeof val != accepted)
                    throw new Error('Multitype arrays are not accepted');
                switch (typeof val) {
                    case 'string':
                        bytes[idx] = val.charCodeAt(0);
                        break;
                    case 'number':
                        bytes[idx] = val;
                        break;
                    default:
                        throw new Error('Could not parse array, got ' + (typeof val) + ' type when expecting ' + (typeof accepted));
                }
            });
            return bytes;
        }
        throw new Error('Failed to parse input');
    }
})

const schema = `#graphql
scalar BLOB
enum CableType {
    CAT4,
    CAT5,
    CAT6,
    Fiber,
    Virtual
}
enum ImgType {
    SVG,
    JPG
}

type Node {
    UUID:String,
    name:String,
    connections:[CrossConnect]
}

type CrossConnect {
    from:Node,
    to:Node,
    type:CableType
}

type CCSearch {
    byUUID(uuid:String):Node
    byName(name:String):Node
    all:[Node!]!
}

type Query {
    crossconnect:CCSearch!
    img(imgType:ImgType):BLOB
}

type Mutation {
    addCrossConnect(from:String, to:String, type:CableType):Boolean
    addNode(nodeName:String):Node
}
`

const resolvers = {
    Query: {

    },
    Mutation: {
        async addCrossConnect(...params: [any]): Promise<boolean> {
            console.log(`AddCrossConnect called with params: ${params}`);
            return true;//TODO remove when done
        }
    },
    BLOB: blobScalar
}
export class v1 {
    private ready: boolean;

    public middleware: RequestHandler = () => { };
    public database: Database<sqlite3.Database, sqlite3.Statement> | undefined;
    public ccmanager?:Manager//ignore this it gets reassigned

    public constructor(onReady: () => void) {
        this.ready = false;
        console.log('Entering IIFE');
        (async () => {
            console.log('opening db');
            // this.database = await dbOpen({
            //     driver: sqlite3.Database,
            //     filename: "crossconnects.db"
            // });
            // console.log('Setting WAL mode');
            // await this.database.exec(`PRAGMA journal_mode=WAL;`);
            // console.log('Instantiating GQL server');
            // await this.database?.exec(/*sql*/`SELECT * FROM NODEDB LIMIT 1;`).catch(async (e) => {
            //     process.stdout.write('Node Database not instantiated, running declaration:  ');
            //     await this.database?.exec(/*sql*/`
            //     CREATE TABLE NODEDB (
            //         --UUID
            //         ID TEXT PRIMARY KEY NOT NULL,
            //         --Name/ref#/etc (SHOULD NOT BE BASED ON LOCATION)
            //         nodeName TEXT NOT NULL,
            //         --Whether or not additional cross connects should be run to this node
            //         Deprecated Boolean NOT NULL DEFAULT False,
            //         --Serial number
            //         SerialNum TEXT NOT NULL UNIQUE,
            //         --Location string, I.E. DC-A-R-01-01:14-17 for DC-A Row 1 Rack 1 units 14 through 17
            //         nodeLocation TEXT NOT NULL
            //     );`);
            //     console.log('Done');
            // }).finally(() => {
            //     console.log('Node Database loaded');
            // });
            // await this.database.exec(/*sql*/`SELECT * FROM CCDB LIMIT 1;`).catch(async (e) => {
            //     process.stdout.write('Edge Database not instantiated, running declaration:  ');
            //     await this.database?.exec(/*sql*/`
            //     CREATE TABLE CCDB (
            //         --UUID
            //         XCID TEXT PRIMARY KEY NOT NULL,
            //         --ID of start Node
            //         startID INTEGER NOT NULL,
            //         --ID of end Node
            //         endID INTEGER NOT NULL,
            //         --Should be CatX | Fiber, enforced on API
            //         runType TEXT NOT NULL,

            //         --Length stored as [..feet][inches%2d]
            //         runLength INTEGER NOT NULL,

            //         --File upload of SOF
            //         SOF BLOB NOT NULL,
            //         FOREIGN KEY(startID) REFERENCES NODEDB(ID)
            //         FOREIGN KEY(endID) REFERENCES NODEDB(ID)
            //     );`);
            //     console.log('Done');
            // }).finally(() => {
            //     console.log('Edge Database loaded');
            // });
            const server = new ApolloServer<{}>({
                typeDefs: schema,
                resolvers: resolvers
            });
            await server.start();
            console.log('Instantiating graph manager');
            this.ccmanager = await Manager.create();
            assert.ok(typeof this.ccmanager !== 'undefined', "Could not instantiate cc manager");
            console.log('Finishing up');
            this.middleware = expressMiddleware(server);
            this.ready = true;
            console.log('Firing callback');
            onReady();
        })();
    }
}