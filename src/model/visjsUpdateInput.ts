import { Edge, Node } from 'vis-network';

export interface VisjsUpdateInput {
  addNodes: Node[];
  updateNodes: Node[];
  deleteNodeIds: string[];

  addEdges: Edge[];
  deleteEdgeIds: string[];
}
