import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4"
import express, { RequestHandler } from "express";

import sqlite3 from "sqlite3";
import { Database, open as dbOpen } from "sqlite";

const schema = `#graphql
enum CableType {
    CAT4,
    CAT5,
    CAT6,
    Fiber,
    Virtual
}

type Node {
    UUID:String,
    name:String,
    connections:[CrossConnect!]!
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
}

type Mutation {
    addCrossConnect(from:String, to:String, type:CableType):Boolean
    addNode(nodeName:String):Node
}
`

export class v1 {
    private ready: boolean;

    public middleware: RequestHandler = () => {};
    private database: Database<sqlite3.Database, sqlite3.Statement> | undefined;

    public constructor(onReady: () => void) {
        this.ready = false;
        console.log('Entering IIFE');
        (async () => {
            console.log('opening db');
            this.database = await dbOpen({
                driver: sqlite3.Database,
                filename: "crossconnects.db"
            });
            console.log('Setting WAL mode');
            await this.database.exec(`PRAGMA journal_mode=WAL;`);
            console.log('Instantiating GQL server');
            const server = new ApolloServer<{}>({
                typeDefs: schema,
                resolvers: {

                }
            });
            await server.start();
            console.log('Finishing up');
            this.middleware = expressMiddleware(server);
            this.ready = true;
            console.log('Firing callback');
            onReady();
        })();
    }
}