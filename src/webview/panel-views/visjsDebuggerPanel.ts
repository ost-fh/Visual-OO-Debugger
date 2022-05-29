import { DebuggerPanel, registerDebuggerPanelFactory } from './debuggerPanel';
import { DataSet } from 'vis-data';
import { ClusterOptions, Data, Edge, EdgeOptions, IdType, Network, Node, NodeOptions, Options } from 'vis-network';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { DebuggerPanelMessageService } from './debuggerPanelMessageService';

type EdgesClusterStackEntry = Record<'fromCluster' | 'toCluster', string[]>;
type EdgesClusterStack = EdgesClusterStackEntry[];

type WithDefinedId<T extends Partial<Record<'id', unknown>>> = T & Required<Pick<T, 'id'>>;
type NodeWithDefinedId = WithDefinedId<Node>;
type EdgeWithDefinedId = WithDefinedId<Edge>;
type EdgeWithDefinedFromAndTo = Edge & Required<Pick<Edge, 'from' | 'to'>>;

export class VisjsDebuggerPanel extends DebuggerPanel<Data, Options, VisjsUpdateInput> {
  private _network?: Network;
  private _nodes?: DataSet<Node>;
  private _edges?: DataSet<Edge>;
  private defaultNodeColor?: NodeOptions['color'];
  private defaultEdgeColor?: EdgeOptions['color'];

  constructor(window: Window, document: Document, messageService: DebuggerPanelMessageService) {
    super(window, document, messageService);
  }

  protected initializeRenderingArea(renderingArea: HTMLDivElement, data: Data, options: Options): void {
    this._nodes = new DataSet(data.nodes as Node[]);
    this._edges = new DataSet(data.edges as Edge[]);
    this.defaultNodeColor = options.nodes?.color;
    this.defaultEdgeColor = options.edges?.color;
    const { nodes, edges } = this;
    this._network = new Network(
      renderingArea,
      {
        nodes,
        edges,
      },
      options
    );
    const { network } = this;
    network.on('selectNode', (params: Record<'nodes', string[]>) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];
        if (network.isCluster(node)) {
          network.openCluster(node);
        } else if (node.startsWith('variable_')) {
          this.clusterNodes(node);
        } else {
          this.clusterChildNodes(node);
        }
      }
    });
  }

  protected updateRenderingArea(data: VisjsUpdateInput): void {
    const { nodes, edges } = this;
    edges.remove(data.deleteEdgeIds);
    nodes.remove(data.deleteNodeIds);
    nodes.updateOnly(
      nodes.map((node) => ({
        ...(node as NodeWithDefinedId),
        color: this.defaultNodeColor,
      }))
    );
    edges.updateOnly(
      edges.map((edge) => ({
        ...(edge as EdgeWithDefinedId),
        color: this.defaultEdgeColor,
      }))
    );
    const edgesClusterStack = this.getEdgesClusterStack(data);
    nodes.add(data.addNodes);
    nodes.updateOnly(data.updateNodes as NodeWithDefinedId[]);
    edges.add(data.addEdges);
    this.reCluster(edgesClusterStack);
  }

  protected openAllClusters(): void {
    this.openClusterStack(
      Object.keys((this.network as Network & Record<'body', Record<'nodes', DataSet<Node>>>).body.nodes).filter((nodeId) => {
        return nodeId.startsWith('cluster_');
      })
    );
  }

  private clusterChildNodes(id: string): void {
    const nodeList = new Set([id]);
    const childNodes = this.network.getConnectedNodes(id, 'to') as IdType[];
    childNodes.forEach((childNode) => {
      nodeList.add(childNode as string);
      this.getAllConnectingNodes(childNode, nodeList);
    });
    this.clusterNodes(id, nodeList);
  }

  private getAllConnectingNodes(id: IdType, nodeList: Set<IdType>): Set<IdType> {
    const children = (this.network.getConnectedNodes(id) as IdType[]).filter((nodeId) => !nodeList.has(nodeId));
    if (children.length !== 0) {
      children.forEach((child) => {
        nodeList.add(child);
        this.getAllConnectingNodes(child, nodeList);
      });
    }
    return nodeList;
  }

  private clusterNodes(id: string, nodeList?: Set<IdType>): void {
    const { network } = this;
    const options: ClusterOptions = {
      joinCondition: nodeList ? (nodeOptions: NodeWithDefinedId): boolean => nodeList.has(nodeOptions.id) : undefined,
      processProperties: (clusterOptions: Node) => {
        clusterOptions.id = 'cluster_' + id;
        clusterOptions.label = this.nodes.get(id)?.label;
        return clusterOptions;
      },
      clusterNodeProperties: {
        borderWidth: 5,
      },
    };
    if (nodeList) {
      network.cluster(options);
    } else {
      network.clusterByConnection(id, options);
    }
  }

  private getEdgesClusterStack(updateInput: VisjsUpdateInput): EdgesClusterStack {
    const edgesClusterStack: EdgesClusterStack = [];
    const { network } = this;
    (updateInput.addEdges as EdgeWithDefinedFromAndTo[]).forEach((edge) => {
      if (network.findNode(edge.from).length > 1 || network.findNode(edge.to).length > 1) {
        edgesClusterStack.push({
          fromCluster: network.findNode(edge.from) as string[],
          toCluster: network.findNode(edge.to) as string[],
        });
      }
    });
    return edgesClusterStack;
  }

  private reCluster(edgesClusterStack: EdgesClusterStack): void {
    edgesClusterStack.forEach((edge) => {
      if (edge.fromCluster.length < edge.toCluster.length) {
        this.openClusterStack(edge.fromCluster.filter((cluster) => !edge.toCluster.includes(cluster)));
        this.updateCluster(edge.toCluster);
      } else {
        this.openClusterStack(edge.toCluster.filter((cluster) => !edge.fromCluster.includes(cluster)));
        this.updateCluster(edge.fromCluster);
      }
    });
  }

  private updateCluster(clusterStack: string[]): void {
    if (clusterStack.length >= 1) {
      const { network } = this;
      if (clusterStack[0] !== undefined && network.isCluster(clusterStack[0])) {
        const clusterNodeId = clusterStack[0].substring(8);
        network.openCluster(clusterStack[0]);

        clusterStack.shift();
        this.updateCluster(clusterStack);

        if (clusterNodeId.startsWith('variable_')) {
          this.clusterNodes(clusterNodeId);
        } else {
          this.clusterChildNodes(clusterNodeId);
        }
      } else {
        clusterStack.shift();
        this.updateCluster(clusterStack);
      }
    }
  }

  private openClusterStack(clusterStack: string[]): void {
    const { network, nodes } = this;
    clusterStack.forEach((cluster) => {
      if (nodes.get(cluster) !== undefined && network.isCluster(cluster)) {
        network.openCluster(cluster);
      }
    });
  }

  private get network(): Network {
    const network = this._network;
    if (!network) {
      throw new Error('Network not set');
    }
    return network;
  }

  private get nodes(): DataSet<Node> {
    const nodes = this._nodes;
    if (!nodes) {
      throw new Error('Nodes not set');
    }
    return nodes;
  }

  private get edges(): DataSet<Edge> {
    const edges = this._edges;
    if (!edges) {
      throw new Error('Edges not set');
    }
    return edges;
  }
}

registerDebuggerPanelFactory((window, document, messageService) => new VisjsDebuggerPanel(window, document, messageService));
