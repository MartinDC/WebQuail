// Adapted by MDC 2021 from:

// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html

// TODO : Better types for all functions and parts


// HOW TO USE:
// var graph = new Graph([
//     [1,1,1,1],
//     [0,1,1,0],
//     [0,0,1,1]
// ]);

// var start = graph.grid[0][0];
// var end = graph.grid[1][2];
// var result = astar.search(graph, start, end);
// // result is an array containing the shortest path

// var graphDiagonal = new Graph([
//     [1,1,1,1],
//     [0,1,1,0],
//     [0,0,1,1]
// ], { diagonal: true });

// var start = graphDiagonal.grid[0][0];
// var end = graphDiagonal.grid[1][2];
// var resultWithDiagonals = astar.search(graphDiagonal, start, end, { heuristic: astar.heuristics.diagonal });

// // Weight can easily be added by increasing the values within the graph, and where 0 is infinite (a wall)
// var graphWithWeight = new Graph([
//     [1,1,2,30],
//     [0,4,1.3,0],
//     [0,0,5,1]
// ]);
// var startWithWeight = graphWithWeight.grid[0][0];
// var endWithWeight = graphWithWeight.grid[1][2];
// var resultWithWeight = astar.search(graphWithWeight, startWithWeight, endWithWeight);

// // resultWithWeight is an array containing the shortest path taking into account the weight of a node

import { WQBinaryHeap } from "../data/binaryheap";

export type WQGraphPos = { x: number, y: number }; // Used to get a position in the graph grid.
export type WQAStarWeightGrid = Array<Array<number>>;

type WQAstarHeuristicFunctionType = (pos0: WQAStarGridNode, pos1: WQAStarGridNode) => number;

export class WQAStarOptions {
    public heuristics?: WQAstarHeuristicFunctionType;
    public closest?: boolean;
}

/**
 * Perform an A* Search on a graph given a start and end node.
 * @param {Graph} graph
 * @param {GridNode} start
 * @param {GridNode} end
 * @param {Object} [options]
 * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
* @param {Function} [options.heuristic] Heuristic function (see
*          astar.heuristics).
*/
export class WQAStarPathfinder {
    private graphReference: WQAStarGraph = undefined;

    searchWithPosition(start: WQGraphPos, end: WQGraphPos, options?: WQAStarOptions) {
        if (this.graphReference.grid.length < start.x) { throw "WQAStarPathfinder - start width is outside of bounds of graph"; }
        if (this.graphReference.grid.length < end.x) { throw "WQAStarPathfinder - end width is outside of bounds of graph"; }
        if (this.graphReference.grid[start.x].length < start.y) { throw "WQAStarPathfinder - start length is outside of bounds of graph"; }
        if (this.graphReference.grid[end.x].length < end.y) { throw "WQAStarPathfinder - end length is outside of bounds of graph"; }
        return this.search(this.graphReference.grid[start.x][start.y], this.graphReference.grid[end.x][end.y], options);
    }

    search(start: WQAStarGridNode, end: WQAStarGridNode, options?: WQAStarOptions) {
        if (!this.graphReference) { throw "WQAStarPathfinder - No graph available! Did you forget to call withGraph?"; }
        var heuristic = options?.heuristics || this.heuristics.manhattan;
        var closest = options?.closest || false;

        const graph = this.graphReference;
        graph.cleanDirty();

        var openHeap = this.getHeap();
        var closestNode = start; // set the start node to be the closest if required

        start.h = heuristic(start, end);
        openHeap.push(start);

        while (openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if (currentNode === end) {
                return this.pathTo(currentNode);
            }

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var gScore = currentNode.g + neighbor.getCost(currentNode),
                    beenVisited = neighbor.visited;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor, end);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;
                    graph.markDirty(neighbor);
                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                            closestNode = neighbor;
                        }
                    }

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    }
                    else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        if (closest) {
            return this.pathTo(closestNode);
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    }

    withGraph(gridIn: WQAStarWeightGrid) {
        this.graphReference = new WQAStarGraph(gridIn, this);
        return this;
    }

    withDiagonalGraph(gridIn: WQAStarWeightGrid) {
        this.graphReference = new WQAStarGraph(gridIn, this, true);
        return this;
    }

    cleanNode(node: WQAStarGridNode) {
        node.visited = false;
        node.closed = false;
        node.parent = null;
        node.f = 0;
        node.g = 0;
        node.h = 0;
    }

    private getHeap() {
        return new WQBinaryHeap(function (node: WQAStarGridNode) {
            return node.f;
        });
    }

    private pathTo(node: WQAStarGridNode) {
        var curr = node, path = [];
        while (curr.parent) {
            path.unshift(curr);
            curr = curr.parent;
        }
        return path;
    }

    get heuristics(): { manhattan: WQAstarHeuristicFunctionType, diagonal: WQAstarHeuristicFunctionType } {
        return {
            manhattan: (pos0: WQAStarGridNode, pos1: WQAStarGridNode) => {
                var d1 = Math.abs(pos1.x - pos0.x);
                var d2 = Math.abs(pos1.y - pos0.y);
                return d1 + d2;
            },
            diagonal(pos0: WQAStarGridNode, pos1: WQAStarGridNode) {
                var D = 1;
                var D2 = Math.sqrt(2);
                var d1 = Math.abs(pos1.x - pos0.x);
                var d2 = Math.abs(pos1.y - pos0.y);
                return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
            }
        }
    }
}

/**
* A graph memory structure
* @param {Array} gridIn 2D array of input weights
* @param {Object} [options]
* @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed.
*/

export class WQAStarGraph {
    public grid: Array<Array<WQAStarGridNode>> = undefined;

    private dirtyNodes: Array<WQAStarGridNode> = undefined;
    private nodes: Array<WQAStarGridNode> = undefined;

    constructor(gridIn: WQAStarWeightGrid, private astar: WQAStarPathfinder, private diagonal: boolean = false) {
        if (!astar) { throw "Astar not connected to graph - did you forget to call withGraph?"; }

        this.nodes = this.grid = [];
        for (var x = 0; x < gridIn.length; x++) {
            this.grid[x] = [];

            for (var y = 0, row = gridIn[x]; y < row.length; y++) {
                var node = new WQAStarGridNode(x, y, row[y]);
                this.grid[x][y] = node;
                this.nodes.push(node);
            }
        }
        this.init();
    }

    init() {
        this.dirtyNodes = [];
        for (var i = 0; i < this.nodes.length; i++) {
            this.astar.cleanNode(this.nodes[i]);
        }
    }

    cleanDirty() {
        for (var i = 0; i < this.dirtyNodes.length; i++) {
            this.astar.cleanNode(this.dirtyNodes[i]);
        }
        this.dirtyNodes = [];
    }

    markDirty(node: WQAStarGridNode) {
        this.dirtyNodes.push(node);
    }

    neighbors(node: WQAStarGridNode) {
        var grid = this.grid;
        var x = node.x;
        var y = node.y;
        var ret = [];

        // West
        if (grid[x - 1] && grid[x - 1][y]) {
            ret.push(grid[x - 1][y]);
        }

        // East
        if (grid[x + 1] && grid[x + 1][y]) {
            ret.push(grid[x + 1][y]);
        }

        // South
        if (grid[x] && grid[x][y - 1]) {
            ret.push(grid[x][y - 1]);
        }

        // North
        if (grid[x] && grid[x][y + 1]) {
            ret.push(grid[x][y + 1]);
        }

        if (this.diagonal) {
            // Southwest
            if (grid[x - 1] && grid[x - 1][y - 1]) {
                ret.push(grid[x - 1][y - 1]);
            }

            // Southeast
            if (grid[x + 1] && grid[x + 1][y - 1]) {
                ret.push(grid[x + 1][y - 1]);
            }

            // Northwest
            if (grid[x - 1] && grid[x - 1][y + 1]) {
                ret.push(grid[x - 1][y + 1]);
            }

            // Northeast
            if (grid[x + 1] && grid[x + 1][y + 1]) {
                ret.push(grid[x + 1][y + 1]);
            }
        }

        return ret;
    }

    toString() {
        var graphString = [],
            nodes = this.grid, // when using grid
            rowDebug, row, y, l;
        for (var x = 0, len = nodes.length; x < len; x++) {
            rowDebug = [];
            row = nodes[x];
            for (y = 0, l = row.length; y < l; y++) {
                rowDebug.push(row[y].weight);
            }
            graphString.push(rowDebug.join(" "));
        }
        return graphString.join("\n");
    }
}

export class WQAStarGridNode {
    constructor(public x: number, public y: number, public weight: number, public f?: number, public g?: number, public h?: number, public closed?: boolean, public visited?: boolean, public parent?: WQAStarGridNode) { }

    getCost(fromNeighbor: WQAStarGridNode) {
        // Take diagonal weight into consideration.
        if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
            return this.weight * 1.41421;
        }
        return this.weight;
    }

    isWall() {
        return this.weight === 0;
    }

    toString() {
        return "[" + this.x + " " + this.y + "]";
    }
}