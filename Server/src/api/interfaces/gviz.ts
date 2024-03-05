import uuid from 'uuid';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';

type GraphNode = {
    UUID: string,
    name: string,
    connections: GraphEdge[],
};
type GraphEdge = {
    from: GraphNode,
    to: GraphNode,
    type: "CAT4" | "CAT5" | "CAT6" | "Fiber" | "Virtual"
};

export default class gviz {
    private nodes: Map<string, GraphNode> = new Map();
    private edges: Map<string, GraphEdge> = new Map();
    /**
     * Instantiates a new graph manager
     */
    public gviz() {
        this.nodes = new Map<string, GraphNode>();
        this.edges = new Map<string, GraphEdge>();
    }
    /**
     * @param {string} nodeName - What to name the added network node
     * @param {Array<GraphEdge>} connections - An array of connections bound to the node.
     * @returns {string} UUID of the added node
     */
    public addNode(nodeName: string, connections?: GraphEdge[]): string {
        const _uuid = uuid.v4();
        const _connections = (connections == undefined ? [] : connections).map((edge): GraphEdge => {
            if (!this.nodes.has(edge.to.UUID))
                throw new Error(`Node ${edge.to.UUID} does not exist`);
            return edge;
        });
        this.nodes.set(_uuid, { UUID: _uuid, name: nodeName, connections: _connections });
        for (let edge of _connections) {
            this.nodes.get(edge.to.UUID)?.connections.push(edge);
        }
        for (let edge of _connections) {
            this.edges.set(uuid.v4(), edge);
        }
        return _uuid
    }
    /**
     * 
     * @param {string} nodeA UUID or name of the primary node
     * @param {string} nodeB UUID or name of the secondary node
     * @param {GraphEdge['type']} cableType Type of cable run
     * @returns {string} UUID of the added connection
     */
    public connect(nodeA: string, nodeB: string, cableType: GraphEdge['type']): string {
        if (!uuid.validate(nodeA)) {
            for (let [uuid, node] of this.nodes) {
                if (node.name == nodeA)
                    nodeA = uuid;
            }
            if (!uuid.validate(nodeA))
                throw new Error(`Could not find ${nodeA}`);
        }
        if (!uuid.validate(nodeB)) {
            for (let [uuid, node] of this.nodes) {
                if (node.name == nodeB)
                    nodeB = uuid;
            }
            if (!uuid.validate(nodeB))
                throw new Error(`Could not find ${nodeB}`);
        }
        //Both nodes should be valid UUIDs now
        if (!(this.nodes.has(nodeA) && this.nodes.has(nodeB)))
            throw new Error('Failed to create connection: could not find nodes');
        let _uuid = uuid.v4();

        this.edges.set(_uuid, {
            from: this.nodes.get(nodeA)!,//HACK this is type safe becuase of validation above
            to: this.nodes.get(nodeB)!,  //HACK this is type safe becuase of validation above
            type: cableType
        });
        this.nodes.get(nodeA)!.connections.push(this.edges.get(_uuid)!);
        this.nodes.get(nodeB)!.connections.push(this.edges.get(_uuid)!);

        return _uuid;
    }

    public async save(db: Database<sqlite3.Database, sqlite3.Statement>) {
        /*
         * verify existing data matches
        */
        console.log(JSON.stringify(await db.all(/*sql*/`
        pragma table_info("CCDB");
        `)) === JSON.stringify([
            { cid: 0, name: "XCID", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
            { cid: 1, name: "startID", type: "INTEGER", notnull: 1, dflt_value: null, pk: 0 },
            { cid: 2, name: "endID", type: "INTEGER", notnull: 1, dflt_value: null, pk: 0 },
            { cid: 3, name: "runType", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
            { cid: 4, name: "runLength", type: "INTEGER", notnull: 1, dflt_value: null, pk: 0 },
            { cid: 5, name: "SOF", type: "BLOB", notnull: 1, dflt_value: null, pk: 0 }
        ]));
        console.log(JSON.stringify(await db.all(/*sql*/`
        pragma table_info("NODEDB");
        `)) === JSON.stringify([
            { cid: 0, name: 'nodeName', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
            { cid: 1, name: 'ID', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
            { cid: 2, name: 'Deprecated', type: 'Boolean', notnull: 1, dflt_value: 'False', pk: 0 },
            { cid: 3, name: 'SerialNum', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
            { cid: 4, name: 'nodeLocation', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
        ]));
        {
            const existing:Array<string> = await db.all(/*sql*/`
            SELECT * FROM CCDB;
            SELECT * FROM NODEDB;
            `);
        }
    }
    public load(db: Database<sqlite3.Database, sqlite3.Statement>) {

    }
}