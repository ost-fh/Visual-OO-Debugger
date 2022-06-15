import { Button } from '@vscode/webview-ui-toolkit';
import { DataSet } from 'vis-data';
import { Data, Edge, EdgeOptions, Network, Node, Options } from 'vis-network';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { hasClusterPrefix } from '../../util/nodePrefixHandler';
import { WebMRecorder } from '../../util/webMRecorder';
import { GifRecorder } from '../../util/gifRecorder';
import { DebuggerPanel, registerDebuggerPanelFactory } from './debuggerPanel';
import { DebuggerPanelMessageService } from './debuggerPanelMessageService';
import { VisjsGroupName } from './visjsGroupName';

type WithDefinedId<T extends Partial<Record<'id', unknown>>> = T & Required<Pick<T, 'id'>>;
type NodeWithDefinedId = WithDefinedId<Node>;
type EdgeWithDefinedId = WithDefinedId<Edge>;

export class VisjsDebuggerPanel extends DebuggerPanel<Data, Options, VisjsUpdateInput> {
  private _network?: Network;
  private _nodes?: DataSet<Node>;
  private _edges?: DataSet<Edge>;
  private defaultEdgeColor?: EdgeOptions['color'];
  private _webMRecorder?: WebMRecorder;
  private _gifRecorder?: GifRecorder;

  constructor(window: Window, document: Document, messageService: DebuggerPanelMessageService) {
    super(window, document, messageService);
    this.renderIndicator = this.createRenderIndicator();
    document.body.appendChild(this.renderIndicator);
  }

  private readonly renderIndicator;

  //  Initialization :: UI :: Tool bar

  protected createToolBar(): HTMLDivElement {
    const toolBar = super.createToolBar();
    toolBar.appendChild(this.createHideNodeButton());
    return toolBar;
  }

  private createHideNodeButton(): Button {
    const button = this.createToolBarButton('hide-node-button', 'Hides node dragged onto it', 'eye-closed', () => this.showAllNodes());
    button.addEventListener('mouseup', (event) => this.hideNode(event));
    button.addEventListener('mouseenter', (event) => this.setOpacity(event, 0.8));
    button.addEventListener('mouseleave', (event) => this.setOpacity(event, 1));
    return button;
  }

  private createRenderIndicator(): HTMLDivElement {
    return this.createDiv('render-indicator');
  }

  //  Event processing :: Message -> Rendering area

  protected initializeRenderingArea(renderingArea: HTMLDivElement, data: Data, options: Options): void {
    this._nodes = new DataSet(data.nodes as Node[]);
    this._edges = new DataSet(data.edges as Edge[]);
    this.defaultEdgeColor = options.edges?.color;
    const { nodes, edges } = this;
    this._network = new Network(renderingArea, { nodes, edges }, options);
    const { network } = this;
    network.on('selectNode', (params: Record<'nodes', string[]>) => {
      if (params.nodes.length === 1) {
        const node = params.nodes[0];
        if (hasClusterPrefix(node)) {
          this.openCluster(node);
        } else {
          this.createCluster(node);
        }
      }
    });
    this._webMRecorder = new WebMRecorder(VisjsDebuggerPanel.getCanvas(renderingArea));
    this._gifRecorder = new GifRecorder(VisjsDebuggerPanel.getCanvas(renderingArea));
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
      }))
    );
    nodes.add(data.addNodes);
    nodes.updateOnly(data.updateNodes as NodeWithDefinedId[]);
    edges.add(data.addEdges);
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
    return this.gifRecorder.isRecording;
  }

  protected startGifRecording(): void {
    this.gifRecorder.startRecording((blob) => {
      this.setRenderIndicatorVisibility(false);
      this.downloadBlobFile('export.gif', blob);
    });
  }

  protected stopGifRecording(): void {
    this.setRenderIndicatorVisibility(true);
    setTimeout(() => {
      this.gifRecorder.stopRecording();
      this.updateRecordingIndicatorVisibility();
    }, 100);
  }

  private static getCanvas(renderingArea: HTMLDivElement): HTMLCanvasElement {
    const canvas = renderingArea.querySelector('canvas');
    if (!canvas) {
      throw new Error('Cannot not found');
    }
    return canvas;
  }

  //  Event processing :: UI :: Tool bar

  private openCluster(clusterId: string): void {
    this.messageService.openCluster(clusterId);
  }

  private createCluster(clusterId: string): void {
    this.messageService.createCluster(clusterId);
  }

  private showAllNodes(): void {
    this.messageService.showAllNodes();
  }

  private hideNode({ pageX, pageY }: MouseEvent): void {
    const nodeId = this.network.getNodeAt({
      x: pageX,
      y: pageY,
    }) as string;
    if (nodeId) {
      this.messageService.hideNode(nodeId);
    }
  }

  private setOpacity({ pageX, pageY }: MouseEvent, opacity: number): void {
    const nodeId = this.network.getNodeAt({
      x: pageX,
      y: pageY,
    });
    if (nodeId) {
      this.nodes.updateOnly({
        id: nodeId,
        opacity,
      });
    }
  }

  private setRenderIndicatorVisibility(visible: boolean): void {
    this.renderIndicator.style.display = visible ? 'flex' : 'none';
  }

  //  Utilities :: Safe access

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

  private get webMRecorder(): WebMRecorder {
    const webMRecorder = this._webMRecorder;
    if (!webMRecorder) {
      throw new Error('WebM recorder not set');
    }
    return webMRecorder;
  }

  private get gifRecorder(): GifRecorder {
    const gifRecorder = this._gifRecorder;
    if (!gifRecorder) {
      throw new Error('GIF recorder not set');
    }
    return gifRecorder;
  }
}

registerDebuggerPanelFactory((window, document, messageService) => new VisjsDebuggerPanel(window, document, messageService));
