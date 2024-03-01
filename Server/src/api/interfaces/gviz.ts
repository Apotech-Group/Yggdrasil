import uuid from 'uuid';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';


type UUID = typeof uuid.v4;
type GraphNode = {
    UUID:string,
    name:string,
    connections:GraphEdge[]
};
type GraphEdge = {
    from:GraphNode,
    to:GraphNode,
    type: "CAT4"|"CAT5"|"CAT6"|"Fiber"|"Virtual"
};

export default class gviz {
    private nodes:Map<string, GraphNode> = new Map();
    private edges:Map<string, GraphEdge> = new Map();
    public gviz() {
        this.nodes = new Map<string, GraphNode>();
        this.edges = new Map<string, GraphEdge>();
    }
    public addNode(nodeName:string, connections?:GraphEdge[]):string{
        const _uuid = uuid.v4();
        const _connections = (connections == undefined?[]:connections).map((edge):GraphEdge => {
            if (!this.nodes.has(edge.to.UUID))
                throw new Error(`Node ${edge.to.UUID} does not exist`);
            return edge;
        });
        this.nodes.set(_uuid, {UUID: _uuid, name:nodeName, connections: _connections});
        for (let edge of _connections) {
            this.nodes.get(edge.to.UUID)?.connections.push(edge);
        }
        for (let edge of _connections) {
            this.edges.set(uuid.v4(), edge);
        } 
        return _uuid
    }
    public connect(nodeA:string, nodeB:string) {
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
        //TODO finish connection
    }
    public save(db:Database<sqlite3.Database, sqlite3.Statement>) {
        //TODO method to save to database
    }
}