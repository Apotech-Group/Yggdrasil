import { UUID } from "crypto";


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
    private nodes:Map<UUID, GraphNode> = new Map();
    private edges:Map<UUID, GraphEdge> = new Map();
    public gviz() {
        this.nodes = new Map<UUID, GraphNode>();
        this.edges = new Map<UUID, GraphEdge>()
    }
}