import { Button } from '@vscode/webview-ui-toolkit';
import { DataSet } from 'vis-data';
import { ClusterOptions, Data, Edge, EdgeOptions, IdType, Network, Node, NodeOptions, Options } from 'vis-network';
import { hasVariablePrefix } from '../../util/nodePrefixHandler';
import { PrefixManager } from '../../util/prefixManager';
import { WebMRecorder } from '../../util/webMRecorder';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { DebuggerPanel, registerDebuggerPanelFactory } from './debuggerPanel';
import { DebuggerPanelMessageService } from './debuggerPanelMessageService';
import { VisjsGroupName } from './visjsGroupName';

type EdgesClusterStackEntry = Record<'fromCluster' | 'toCluster', string[]>;
type EdgesClusterStack = EdgesClusterStackEntry[];

type WithDefinedId<T extends Partial<Record<'id', unknown>>> = T & Required<Pick<T, 'id'>>;
type NodeWithDefinedId = WithDefinedId<Node>;
type EdgeWithDefinedId = WithDefinedId<Edge>;
type EdgeWithDefinedFromAndTo = Edge & Required<Pick<Edge, 'from' | 'to'>>;

type NetworkWithJsProperties = Network & {
  body: {
    nodes: Record<
      IdType,
      {
        options: NodeOptions;
      }
    >;
  };
  clustering: Pick<Network, 'updateClusteredNode' | 'updateEdge'>;
};

export class VisjsDebuggerPanel extends DebuggerPanel<Data, Options, VisjsUpdateInput> {
  private _network?: NetworkWithJsProperties;
  private _nodes?: DataSet<Node>;
  private _edges?: DataSet<Edge>;
  private defaultNodeColor?: NodeOptions['color'];
  private defaultEdgeColor?: EdgeOptions['color'];
  private _webMRecorder?: WebMRecorder;
  private static readonly clusterPrefixManager = new PrefixManager('cluster_');

  private static nodeIdIsClusterNodeId(id: string): boolean {
    return this.clusterPrefixManager.hasPrefix(id);
  }

  private static convertNodeIdToClusterNodeId(id: string): string {
    return this.clusterPrefixManager.addPrefix(id);
  }

  private static convertClusterNodeIdToNodeId(id: string): string {
    return this.clusterPrefixManager.removePrefix(id);
  }

  constructor(window: Window, document: Document, messageService: DebuggerPanelMessageService) {
    super(window, document, messageService);
  }

  //  Initialization :: UI :: Tool bar

  protected createToolBar(): HTMLDivElement {
    const toolBar = super.createToolBar();
    toolBar.appendChild(this.createOpenAllClustersButton());
    toolBar.appendChild(this.createHideNodeButton());
    return toolBar;
  }

  private createOpenAllClustersButton(): Button {
    return this.createToolBarButton('open-all-clusters-button', 'Open all clusters', 'type-hierarchy', () => this.openAllClusters());
  }

  private createHideNodeButton(): Button {
    const button = this.createToolBarButton('hide-node-button', 'Hides node dragged on to it', 'eye-closed', () => this.showAllNodes());
    button.addEventListener('mouseup', (event) => this.hideNode(event));
    button.addEventListener('mouseenter', (event) => this.setOpacity(event, 0.8));
    button.addEventListener('mouseleave', (event) => this.setOpacity(event, 1));
    return button;
  }

  //  Event processing :: Message -> Rendering area

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
    ) as NetworkWithJsProperties;
    const { network } = this;
    network.on('selectNode', (params: Record<'nodes', string[]>) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];
        if (network.isCluster(node)) {
          network.openCluster(node);
          edges.updateOnly(
            edges.map((edge) => ({
              ...(edge as EdgeWithDefinedId),
              physics: this.isPhysicsOn(edge),
            }))
          );
        } else if (hasVariablePrefix(node)) {
          this.clusterNodes(node);
        } else {
          this.clusterChildNodes(node);
        }
      }
    });
    this._webMRecorder = new WebMRecorder(VisjsDebuggerPanel.getCanvas(renderingArea));
  }

  protected updateRenderingArea(data: VisjsUpdateInput): void {
    const { nodes, edges } = this;
    edges.remove(data.deleteEdgeIds);
    nodes.remove(data.deleteNodeIds);
    nodes.updateOnly(
      nodes.map((node) => {
        const group = node.group as VisjsGroupName;
        return {
          ...(node as NodeWithDefinedId),
          group: (group === 'changedVariable' || group === 'defaultVariable' ? 'defaultVariable' : 'defaultNode') as VisjsGroupName,
        };
      })
    );
    edges.updateOnly(
      edges.map((edge) => ({
        ...(edge as EdgeWithDefinedId),
        color: this.defaultEdgeColor,
        physics: this.isPhysicsOn(edge),
      }))
    );
    const edgesClusterStack = this.getEdgesClusterStack(data);
    nodes.add(data.addNodes);
    nodes.updateOnly(data.updateNodes as NodeWithDefinedId[]);
    edges.add(
      data.addEdges.map((edge) => ({
        ...edge,
        physics: this.isPhysicsOn(edge),
      }))
    );
    this.reCluster(edgesClusterStack);
  }

  private isPhysicsOn(edge: Edge): boolean {
    const { network } = this;
    const { nodes } = network.body;
    if (!nodes[edge.to as IdType].options.physics || !nodes[edge.from as IdType].options.physics) {
      return false;
    }
    const clusters = network.findNode(edge.to as IdType).concat(network.findNode(edge.from as IdType));
    return clusters.every((nodeId) => nodes[nodeId].options.physics);
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
    edgesClusterStack.forEach(({ fromCluster, toCluster }) => {
      if (fromCluster.length < toCluster.length) {
        this.openClusterStack(fromCluster.filter((cluster) => !toCluster.includes(cluster)));
        this.updateCluster(toCluster);
      } else {
        this.openClusterStack(toCluster.filter((cluster) => !fromCluster.includes(cluster)));
        this.updateCluster(fromCluster);
      }
    });
  }

  private updateCluster(clusterStack: string[]): void {
    if (clusterStack.length >= 1) {
      const { network } = this;
      const clusterId = clusterStack[0];
      if (clusterId && network.isCluster(clusterId)) {
        const clusterNodeId = VisjsDebuggerPanel.convertClusterNodeIdToNodeId(clusterId);
        const visibility = !network.body.nodes[clusterId].options.hidden;
        network.openCluster(clusterId);

        clusterStack.shift();
        this.updateCluster(clusterStack);

        if (hasVariablePrefix(clusterNodeId)) {
          this.clusterNodes(clusterNodeId);
        } else {
          this.clusterChildNodes(clusterNodeId);
        }
        this.setVisibility(clusterId, visibility);
      } else {
        clusterStack.shift();
        this.updateCluster(clusterStack);
      }
    }
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

  private clusterNodes(id: string, nodeList?: Set<IdType>): void {
    const { network, nodes } = this;
    const node = nodes.get(id);
    const options: ClusterOptions = {
      joinCondition: nodeList && ((nodeOptions: NodeWithDefinedId): boolean => nodeList.has(nodeOptions.id)),
      processProperties: (clusterOptions: Node) => {
        clusterOptions.id = VisjsDebuggerPanel.convertNodeIdToClusterNodeId(id);
        clusterOptions.label = node?.label;
        return clusterOptions;
      },
      clusterNodeProperties: {
        borderWidth: 5,
        group: node?.group,
        color: node?.color,
        font: node?.font,
      },
    };
    if (nodeList) {
      network.cluster(options);
    } else {
      network.clusterByConnection(id, options);
    }
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

  protected exportImage(renderingArea: HTMLDivElement): void {
    this.downloadFile('export.png', VisjsDebuggerPanel.getCanvas(renderingArea).toDataURL('image/png'));
  }

  protected webMRecordingInProgress(): boolean {
    return this.webMRecorder.isRecording;
  }

  protected startWebMRecording(): void {
    this.webMRecorder.startRecording((blob) => this.downloadBlobFile('export.webm', blob));
  }

  protected stopWebMRecording(): void {
    this.webMRecorder.stopRecording();
  }

  protected gifRecordingInProgress(): boolean {
    //  TODO: VOOD-171: Replace with implementation
    return super.gifRecordingInProgress();
  }

  protected startGifRecording(): void {
    //  TODO: VOOD-171: Replace with implementation
    super.stopGifRecording();
  }

  protected stopGifRecording(): void {
    //  TODO: VOOD-171: Replace with implementation
    super.stopGifRecording();
  }

  private static getCanvas(renderingArea: HTMLDivElement): HTMLCanvasElement {
    const canvas = renderingArea.querySelector('canvas');
    if (!canvas) {
      throw new Error('Cannot not found');
    }
    return canvas;
  }

  //  Event processing :: UI :: Tool bar

  private openAllClusters(): void {
    this.openClusterStack(Object.keys(this.network.body.nodes).filter((nodeId) => VisjsDebuggerPanel.nodeIdIsClusterNodeId(nodeId)));
  }

  private showAllNodes(): void {
    const { nodes } = this.network.body;
    const nodeIds = Object.keys(nodes).filter((nodeId) => !nodeId.startsWith('edge'));
    nodeIds.forEach((nodeId) => {
      if (nodes[nodeId].options.hidden) {
        this.setVisibility(nodeId, true);
      }
    });
  }

  private hideNode({ pageX, pageY }: MouseEvent): void {
    const nodeId = this.network.getNodeAt({
      x: pageX,
      y: pageY,
    }) as string;
    if (nodeId) {
      this.setVisibility(nodeId, false);
    }
  }

  private setOpacity({ pageX, pageY }: MouseEvent, opacity: number): void {
    const { network } = this;
    const nodeId = network.getNodeAt({
      x: pageX,
      y: pageY,
    });
    if (nodeId) {
      network.clustering.updateClusteredNode(nodeId, {
        opacity,
      });
    }
  }

  //  Event processing :: Shared

  private openClusterStack(clusterStack: string[]): void {
    const { network } = this;
    clusterStack.forEach((cluster) => {
      if (network.isCluster(cluster)) {
        network.openCluster(cluster);
      }
    });
  }

  private setVisibility(nodeId: string, visibility: boolean): void {
    const { network } = this;
    const nodeEdgeId = VisjsDebuggerPanel.nodeIdIsClusterNodeId(nodeId) ? VisjsDebuggerPanel.convertClusterNodeIdToNodeId(nodeId) : nodeId;
    const nodeEdges = network.getConnectedEdges(nodeEdgeId);
    network.clustering.updateClusteredNode(nodeId, {
      hidden: !visibility,
      physics: visibility,
      opacity: 1,
    });
    nodeEdges.forEach((edgeId) => {
      network.clustering.updateEdge(edgeId, {
        physics: visibility,
      });
    });
  }

  //  Utilities :: Safe access

  private get network(): NetworkWithJsProperties {
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

  private get webMRecorder(): WebMRecorder {
    const webMRecorder = this._webMRecorder;
    if (!webMRecorder) {
      throw new Error('WebM recorder not set');
    }
    return webMRecorder;
  }
}

registerDebuggerPanelFactory((window, document, messageService) => new VisjsDebuggerPanel(window, document, messageService));
