import * as uuid from 'uuid';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';

type GraphNode = {
    UUID: string,
    name: string,
    connections: GraphEdge[],
    deprecated: boolean,
    serial:string,
    location:string,
};
type GraphEdge = {
    from: GraphNode,
    to: GraphNode,
    type: "CAT4" | "CAT5" | "CAT6" | "Fiber" | "Virtual",
};

export default class manager {
    private nodes: Map<string, GraphNode> = new Map();
    private edges: Map<string, GraphEdge> = new Map();
    /**
     * Instantiates a new graph manager
     */
    public manager() {
        this.nodes = new Map<string, GraphNode>();
        this.edges = new Map<string, GraphEdge>();
    }
    /**
     * Instantiates a new graph manager from a sqlite database
     * @param db Database to load the existing connections from
     */
    public static async fromDB(db:Database<sqlite3.Database, sqlite3.Statement>) {
        const inst = new manager();
        const savedNodes: {ID:string, nodeName:string, Deprecated:boolean, SerialNum:string, nodeLocation: string}[] = await db.all(/*sql*/`SELECT * FROM NODEDB;`);
        const savedEdges: {XCID: string, startID:string, endID:string, runType:GraphEdge['type'], runLength: string, SOF:string}[] = await db.all(/*sql*/`SELECT * FROM CCDB;`);
        savedNodes.forEach((node) => {
            inst.addNode(node.nodeName, [], node.nodeLocation, node.SerialNum, node.ID, node.Deprecated);
        });
        savedEdges.forEach((edge) => {
            inst.connect(edge.startID, edge.endID, edge.runType, edge.XCID);
        });
        return inst;
    }
    /**
     * @param {string} nodeName - What to name the added network node
     * @param {Array<GraphEdge>} connections - An array of connections bound to the node.
     * @param {string} locString - A string with the format [dc-row-rack:shelfStart-shelfEnd] describing the node's location
     * @param {string} serial - A serial, VMID, etc describing this specific network node
     * @param {string} id - If loading, the uuid to assign this node
     * @param {boolean} deprecated - Whether additional runs should be made to this device
     * @returns {string} UUID of the added node
     */
    public addNode(nodeName: string, connections: GraphEdge[] = [], locString: string, serial: string, id?:string, deprecated:boolean=false): string {
        const _uuid = id || uuid.v4();
        const _connections = connections.map((edge): GraphEdge => {
            if (!this.nodes.has(edge.to.UUID))
                throw new Error(`Node ${edge.to.UUID} does not exist`);
            return edge;
        });
        this.nodes.set(_uuid, { UUID: _uuid, name: nodeName, connections: _connections, deprecated: deprecated, location: locString, serial: serial });
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
     * @param {string} id If loading, the uuid to assing this connection
     * @returns {string} UUID of the added connection
     */
    public connect(nodeA: string, nodeB: string, cableType: GraphEdge['type'], id?: string): string {
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
        let _uuid = id || uuid.v4();

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
        let nodeStatement = '';
        let edgeStatement = '';
        {
            const existingNodes = await db.all(/*sql*/`SELECT (ID) FROM NODEDB;`);
            const existingEdges = await db.all(/*sql*/`SELECT (XCID) FROM CCDB;`);
            console.log(existingNodes);
            console.log(existingEdges);
            for (let id of this.nodes.keys()) {
                if (!existingNodes.includes(id))
                    nodeStatement += `${(nodeStatement.length == 0 ? '' : ',\n')}(
                        '${id}',
                        '${this.nodes.get(id)?.name}',
                        ${this.nodes.get(id)?.deprecated ? 'TRUE':'FALSE'},
                        '${this.nodes.get(id)?.serial}',
                        '${this.nodes.get(id)?.location}'
                    )`;
            }
        }
        {
            console.debug(nodeStatement+'\n'+edgeStatement);
            await db.exec(/*sql*/`INSERT INTO NODEDB (ID, nodeName, Deprecated, SerialNum, nodeLocation) VALUES ${nodeStatement}`);
            // await db.exec(/*sql*/`INSERT INTO CCDB (XCID, startID, endID, runType, runLength, SOF) VALUES`)
        }
    }
}