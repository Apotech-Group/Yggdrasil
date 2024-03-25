import sqlite3 from "sqlite3";
import { Database, open as dbOpen } from "sqlite";
import assert from "assert";

type DBRow = {
    ID:string,
}
const xcKeys = ['ID', 'FNODE', 'FPORT', 'TNODE', 'TPORT']
type XC = DBRow & {
    FNODE: string,
    FPORT: number,
    TNODE: string,
    TPORT: number
}
const nodeKeys = ['ID', 'SERIALNUM', 'LOCSTRING', 'PORTCOUNT'];
type NODE = DBRow & {
    SERIALNUM: string,
    LOCSTRING: string,
    PORTCOUNT: number
}
type DatabaseReference = Database<sqlite3.Database, sqlite3.Statement>;
export default class Manager {
    protected database?:Database<sqlite3.Database, sqlite3.Statement>;
    private constructor() {}
    public static create():Promise<Manager> {
        return new Promise<Manager>(async (resolve, reject) => {
            const _manager = new Manager();
            _manager.database = await dbOpen({
                driver: sqlite3.Database,
                filename: 'datastore.db'
            });
            //set WAL
            console.log(await _manager.database.get('PRAGMA journal_mode=WAL'));
            assert.ok(typeof _manager.database !== "undefined", "Failed to create or open database");
            await _manager.database.exec('BEGIN TRANSACTION;');

            [
                /// Cross-connect database
                /*sql*/`CREATE TABLE XCDB (
                    ID TEXT NOT NULL PRIMARY KEY,   -- UUID V4 of this CC
                    FNODE TEXT NOT NULL,            -- UUID V4 of FROM node
                    FPORT INTEGER,                  -- Connectd port number [FROM node, NULL if shared or virtual]
                    TNODE TEXT NOT NULL,            -- UUID V4 of TO node
                    TPORT INTEGER,                  -- Conencted port number [TO node, NULL if shared or virtual]
                );`,
                /// Network node database
                /*sql*/`CREATE TABLE NODE (
                    ID TEXT NOT NULL PRIMARY KEY,   -- UUID V4
                    SERIALNUM TEXT NOT NULL UNIQUE, -- Serial of the device
                    LOCSTRING TEXT NOT NULL UNIQUE, -- Format: [Rackstring]:[shelfStart]-[shelfEnd]
                    PORTCOUNT INTEGER,              -- Number of available ports on device, NULL=Unlimited [virtual]
                );`
            ].forEach(async statement => await _manager.database!.exec(statement));

            await _manager.database.exec('COMMIT;');
        });
    }
    private construct = {
        fetcher<T extends DBRow>(dbref:DatabaseReference, tableName:string, column:string):(searchvalue: string) => Promise<(T)[] | null> {
            return async (searchvalue:string) => {
                return (await dbref.all(`SELECT * FROM ${tableName} WHERE ${column} = "${searchvalue}"`) || null)
            }
        },
        setter<T extends DBRow>(dbref:DatabaseReference):(val:T|T[])=>Promise<void> {
            return async(val:T|T[]) => {
                if (
                    Object.keys(val).every((item) => xcKeys.includes(item)) &&
                    xcKeys.every((item) => Object.keys(val).includes(item))
                ) {
                    //  val is XC
                    const rowobj:XC = val as unknown as XC;//HACK THIS IS TYPE SAFE
                    return dbref.exec(/*sql*/`INSERT INTO XCDB (ID, FNODE, FPORT, TNODE, TPORT) VALUES (
                        "${rowobj.ID}",
                        "${rowobj.FNODE}",
                        "${rowobj.FPORT}",
                        "${rowobj.TNODE}",
                        "${rowobj.TPORT}"
                    );`);

                }
                else if (
                    Object.keys(val).every((item) => nodeKeys.includes(item)) &&
                    nodeKeys.every((item) => Object.keys(val).includes(item))
                ) {
                    //val is node
                    const rowobj:NODE = val as unknown as NODE;//HACK THIS IS TYPE SAFE
                    return dbref.exec(/*sql*/`INSERT INTO NODEDB (ID, SERIALNUM, LOCSTRING, PORTCOUNT) VALUES (
                        "${rowobj.ID}",
                        "${rowobj.SERIALNUM}",
                        "${rowobj.LOCSTRING}",
                        "${rowobj.PORTCOUNT||'NULL'}"
                    );`);
                }
            }
        }
    }
    public get = {
        node: {
            byUUID:this.construct.fetcher<NODE>(this.database!, 'NODE', 'ID'),
            bySerial:this.construct.fetcher<NODE>(this.database!, 'NODE', 'SERIALNUM'),
            byLocation: this.construct.fetcher<NODE>(this.database!, 'NODE', 'LOCSTRING'),
        },
        xc: {
            byUUID:this.construct.fetcher<XC>(this.database!, 'XCDB', 'ID'),
            byStartNode: this.construct.fetcher<XC>(this.database!, 'XCDB', 'FNODE'),
            byEndNode: this.construct.fetcher<XC>(this.database!, 'XCDB', 'TNODE'),
            async byConnected(nodeid:string):Promise<(XC)[]> {
                return (await this.byStartNode(nodeid) || []).concat(await this.byEndNode(nodeid) || []);
            }
        }
    }
}