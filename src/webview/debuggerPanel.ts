import { cloneDeep, isEqual } from 'lodash';
import * as tinycolor from 'tinycolor2';
import { commands, ExtensionContext, Memento, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import {
  NodeColor,
  PanelViewColors,
  PanelViewInput,
  PanelViewInputVariableMap,
  PanelViewVariable,
  VariableReference,
  VariableRelation,
} from '../model/panelViewInput';
import { NodeModulesAccessor } from '../node-modules-accessor/nodeModulesAccessor';
import { ObjectDiagramFileSaverFactory } from '../object-diagram/logic/export/objectDiagramFileSaverFactory';
import { PanelViewInputObjectDiagramReader } from '../object-diagram/logic/reader/panelViewInputObjectDiagramReader';
import { ObjectDiagram } from '../object-diagram/model/objectDiagram';
import { FileSaver } from '../object-diagram/utilities/export/fileSaver';
import { MementoAccessor } from '../object-diagram/utilities/storage/mementoAccessor';
import { ContextManager } from '../util/contextManager';
import { addClusterPrefix, removeClusterPrefix } from '../util/nodePrefixHandler';
import { DebuggerPanelMessage } from './panel-views/debuggerPanelMessage';
import { PanelViewCommand, PanelViewProxy } from './panel-views/panelViewProxy';

export class DebuggerPanel {
  private viewPanel: WebviewPanel | undefined;

  private currentPanelViewInput: PanelViewInput | undefined;

  private inputHistory: PanelViewInputVariableMap[] = [];

  private currentVariables: PanelViewInputVariableMap | undefined;

  private currentClusteredVariables: PanelViewInputVariableMap | undefined;

  private historyIndex = -1;

  private clusters = new Set<string>();

  private readonly plantUmlObjectDiagramFileSaver: FileSaver;

  private readonly graphVizObjectDiagramFileSaver: FileSaver;

  private viewColors: PanelViewColors | undefined;

  private readonly viewPanelContextManager = new ContextManager<
    'viewPanel',
    {
      exists: boolean;
      canRecordGif: boolean;
      recordingGif: boolean;
      canRecordWebm: boolean;
      recordingWebm: boolean;
    }
  >('viewPanel', (qualifiedName, value): void => void commands.executeCommand('setContext', qualifiedName, value));

  constructor(private readonly context: ExtensionContext, private panelViewProxy: PanelViewProxy) {
    this.updateCapabilitiesFromPanelViewProxy();
    const objectDiagramFileSaverFactory = this.createObjectDiagramFileSaverFactory(context.workspaceState);
    this.plantUmlObjectDiagramFileSaver = objectDiagramFileSaverFactory.createPlantUmlObjectDiagramFileSaver();
    this.graphVizObjectDiagramFileSaver = objectDiagramFileSaverFactory.createGraphVizObjectDiagramFileSaver();
  }

  openPanel(): void {
    // Make sure only one panel exists
    if (this.viewPanel !== undefined) {
      this.viewPanel.reveal(ViewColumn.Beside);
      return;
    }

    this.viewPanel = window.createWebviewPanel('visualDebugger', 'Visual Debugger', ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        Uri.joinPath(this.context.extensionUri, NodeModulesAccessor.outputPath, 'libs'),
        Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    });

    this.viewPanel.onDidDispose(() => this.teardownPanel(), null, this.context.subscriptions);

    this.viewPanel.webview.html = this.panelViewProxy.getHtml(this.viewPanel.webview);

    this.viewPanel.webview.onDidReceiveMessage(
      (message: DebuggerPanelMessage) => {
        switch (message.command) {
          case 'stepBack':
            this.stepBack();
            break;
          case 'stepForward':
            this.stepForward();
            break;
          case 'selectStackFrame':
            this.selectStackFrame(message.content);
            break;
          case 'openAllClusters':
            this.openAllClusters();
            break;
          case 'openCluster':
            this.openCluster(message.content);
            break;
          case 'createCluster':
            this.createCluster(message.content);
            break;
          default:
            console.warn('Unknown message:', message);
        }
      },
      undefined,
      this.context.subscriptions
    );

    this.viewPanelContextManager.setValue('exists', true);

    if (this.currentPanelViewInput) {
      this.currentVariables = undefined;
      this.currentClusteredVariables = undefined;
      this.updatePanel(this.currentPanelViewInput);
    }
  }

  updatePanel(panelViewInput: PanelViewInput): void {
    this.currentPanelViewInput = panelViewInput;
    if (panelViewInput !== undefined) {
      this.postCommandToWebViewIfViewPanelIsDefined(() => ({
        command: 'updateStackFrames',
        stackFrames: panelViewInput.callstack.map((frame) => frame.name),
      }));

      const topFrameVariables = panelViewInput.callstack[0].variables;
      const hasChanges = this.addToHistory(topFrameVariables);
      if (hasChanges && (this.historyIndex === -1 || this.historyIndex >= this.inputHistory.length - 2)) {
        this.postCommandToWebViewIfViewPanelIsDefined(() => {
          const command = this.delegateUpdate(topFrameVariables);
          this.historyIndex = -1;
          return command;
        });
      }
    }
  }

  exportPanel(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.exportPanel());
  }

  startRecordingPanelGif(): void {
    this.viewPanelContextManager.setValue('recordingGif', true);
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.startRecordingPanelGif());
  }

  startRecordingPanelWebm(): void {
    this.viewPanelContextManager.setValue('recordingWebm', true);
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.startRecordingPanelWebm());
  }

  stopRecordingPanelGif(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.stopRecordingPanelGif());
    this.viewPanelContextManager.setValue('recordingGif', false);
  }

  stopRecordingPanelWebm(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.stopRecordingPanelWebm());
    this.viewPanelContextManager.setValue('recordingWebm', false);
  }

  exportAsPlantUml(): Promise<void> {
    return this.plantUmlObjectDiagramFileSaver.saveFile();
  }

  exportAsGraphViz(): Promise<void> {
    return this.graphVizObjectDiagramFileSaver.saveFile();
  }

  setPanelViewProxy(panelViewProxy: PanelViewProxy): void {
    const viewPanelVisible = this.viewPanel?.visible;
    this.teardownPanel();
    this.panelViewProxy = panelViewProxy;
    this.updateCapabilitiesFromPanelViewProxy();
    if (this.viewColors) {
      this.panelViewProxy.setPanelStyles(this.viewColors);
    }
    if (viewPanelVisible) {
      this.openPanel();
    }
  }

  reset(): void {
    this.currentPanelViewInput = undefined;
    this.currentVariables = undefined;
    this.currentClusteredVariables = undefined;
    this.inputHistory = [];
    this.historyIndex = -1;
    this.clusters.clear();
  }

  setPanelStyles(panelViewColors: PanelViewColors): void {
    DebuggerPanel.normalizeNodeColor(panelViewColors.defaultNodeColor);
    DebuggerPanel.normalizeNodeColor(panelViewColors.defaultVariableColor);
    DebuggerPanel.normalizeNodeColor(panelViewColors.changedNodeColor);
    DebuggerPanel.normalizeNodeColor(panelViewColors.changedVariableColor);
    this.viewColors = panelViewColors;
    this.panelViewProxy.setPanelStyles(panelViewColors);
  }

  private static normalizeNodeColor(nodecolor: NodeColor): void {
    const color = tinycolor(nodecolor.background).isValid() ? tinycolor(nodecolor.background) : tinycolor(nodecolor.fallback);
    nodecolor.background = color.toHexString();
    nodecolor.border = color.darken(10).toHexString();
    nodecolor.font = tinycolor.mostReadable(nodecolor.background, ['#000'], { includeFallbackColors: true }).toHexString();
  }

  private stepBack(): void {
    if (this.inputHistory.length === 1 || this.historyIndex === 0) {
      return;
    }
    if (this.historyIndex === -1) {
      this.historyIndex = this.inputHistory.length - 2;
    } else {
      this.historyIndex--;
    }
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.delegateUpdate(this.inputHistory[this.historyIndex]));
    this.postCommandToWebViewIfViewPanelIsDefined(() => ({ command: 'deselectStackFrames' }));
  }

  private stepForward(): void {
    if (this.historyIndex === -1 || this.historyIndex === this.inputHistory.length - 1) {
      return;
    }
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.delegateUpdate(this.inputHistory[++this.historyIndex]));
    this.postCommandToWebViewIfViewPanelIsDefined(() => ({ command: 'deselectStackFrames' }));
  }

  private addToHistory(variables: PanelViewInputVariableMap): boolean {
    if (isEqual(variables, this.inputHistory[this.inputHistory.length - 1])) {
      return false;
    }
    this.inputHistory.push(variables);
    return true;
  }

  private delegateUpdate(variables: PanelViewInputVariableMap): PanelViewCommand {
    const clusteredVariables = this.applyClustering(variables);
    const command = this.panelViewProxy.updatePanel(clusteredVariables, this.currentClusteredVariables);
    this.currentVariables = variables;
    this.currentClusteredVariables = clusteredVariables;
    return command;
  }

  private selectStackFrame(index: number): void {
    const panelViewInput = this.currentPanelViewInput;
    if (panelViewInput !== undefined) {
      this.postCommandToWebViewIfViewPanelIsDefined(() => {
        const command = this.delegateUpdate(panelViewInput.callstack[index].variables);
        this.historyIndex = -1;
        return command;
      });
    }
  }

  private createObjectDiagramFileSaverFactory(memento: Memento): ObjectDiagramFileSaverFactory {
    return new ObjectDiagramFileSaverFactory(
      new MementoAccessor<string>(memento, 'visual-oo-debugger.lastObjectDiagramExportDirectoryPath'),
      (): ObjectDiagram => {
        const input = this.currentVariables;
        if (!input) {
          throw new Error('Could not export (no panel view input available)');
        }
        return new PanelViewInputObjectDiagramReader().read(input);
      }
    );
  }

  private postCommandToWebViewIfViewPanelIsDefined(commandFactory: () => PanelViewCommand): void {
    void this.viewPanel?.webview.postMessage(commandFactory());
  }

  private teardownPanel(): void {
    if (this.viewPanel !== undefined) {
      this.viewPanel.dispose();
      this.viewPanel = undefined;
    }
    this.inputHistory = [];
    if (typeof this.panelViewProxy.teardownPanelView === 'function') {
      this.panelViewProxy.teardownPanelView();
    }
    this.viewPanelContextManager.setValue('exists', false);
  }

  private updateCapabilitiesFromPanelViewProxy(): void {
    this.viewPanelContextManager.setValues({
      canRecordGif: this.panelViewProxy.canRecordGif(),
      canRecordWebm: this.panelViewProxy.canRecordWebm(),
    });
  }

  private openAllClusters(): void {
    this.clusters.clear();
    this.updatePanelAfterReclustering();
  }

  private openCluster(clusterId: string): void {
    this.clusters.delete(clusterId);
    this.updatePanelAfterReclustering();
  }

  private createCluster(nodeId: string): void {
    const references = this.currentVariables?.get(nodeId)?.references ?? [];
    if (references.length > 0) {
      this.clusters.add(addClusterPrefix(nodeId));
      this.updatePanelAfterReclustering();
    }
  }

  private updatePanelAfterReclustering(): void {
    if (this.currentVariables) {
      const variables = this.currentVariables;
      this.postCommandToWebViewIfViewPanelIsDefined(() => this.delegateUpdate(variables));
    }
  }

  private applyClustering(variables: PanelViewInputVariableMap): PanelViewInputVariableMap {
    variables = cloneDeep(variables);
    for (const cluster of this.clusters) {
      const rootNode = variables.get(removeClusterPrefix(cluster));
      if (rootNode) {
        const referencedNodes = new Set<string>();
        this.addReferencedNodes(rootNode, variables, referencedNodes);
        if (referencedNodes.size === 0) {
          continue;
        }
        const incomingRelations = this.updateReferencesToCluster(cluster, referencedNodes, variables);

        const clusterNode: PanelViewVariable = {
          ...rootNode,
          id: cluster,
          incomingRelations,
          references: [],
        };

        variables.set(cluster, clusterNode);
        referencedNodes.forEach((nodeId) => variables.delete(nodeId));
      }
    }
    return variables;
  }

  private addReferencedNodes(node: PanelViewVariable | undefined, variables: PanelViewInputVariableMap, nodes: Set<string>): void {
    if (!node || nodes.has(node.id)) {
      return;
    }
    nodes.add(node.id);

    for (const referencedNode of node?.references ?? []) {
      const childId = referencedNode.childId;
      this.addReferencedNodes(variables.get(childId), variables, nodes);
    }
  }

  private updateReferencesToCluster(
    clusterId: string,
    containedNodes: Set<string>,
    variables: PanelViewInputVariableMap
  ): VariableRelation[] {
    const relations: VariableRelation[] = [];

    for (const nodeId of containedNodes) {
      const newRelations: VariableRelation[] = (variables.get(nodeId)?.incomingRelations ?? []).filter(
        (relation) => !containedNodes.has(relation.parentId)
      );

      for (const relation of newRelations) {
        const references = variables.get(relation.parentId)?.references as VariableReference[];
        const referencesToNode = references.filter((reference) => reference.childId === nodeId);
        for (const reference of referencesToNode) {
          reference.childId = clusterId;
        }
      }

      relations.push(...newRelations);
    }

    return relations;
  }
}
