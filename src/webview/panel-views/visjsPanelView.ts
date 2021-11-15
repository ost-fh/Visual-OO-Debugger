import { readFileSync } from 'fs';
import { isEqual, some } from 'lodash';
import { Color, Data, Edge, Node, Options } from 'vis-network';
import { ExtensionContext, Uri, Webview } from 'vscode';
import { PanelViewInput, PanelViewVariable, VariableRelation } from '../../model/panelViewInput';
import { ChangeAction, ChangedEdge, ChangedNode, VisjsChangelogEntry } from '../../model/visjsChangelogEntry';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { PanelViewCommand, PanelViewProxy } from './panelViewProxy';

export class VisjsPanelView implements PanelViewProxy {
  private readonly defaultNodeColor: Color = {
    border: '#005cb2',
    background: '#1e88e5',
    highlight: {
      border: '#005cb2',
      background: '#1e88e5',
    },
  };

  private readonly defaultEdgeColor: { color?: string; highlight?: string } = {
    color: '#005cb2',
    highlight: '#005cb2',
  };

  private readonly changedNodeColor: Color = {
    border: '#c6a700',
    background: '#fdd835',
    highlight: {
      border: '#c6a700',
      background: '#fdd835',
    },
  };

  private readonly changedEdgeColor: { color?: string; highlight?: string } = {
    color: '#c6a700',
    highlight: '#c6a700',
  };

  private changelog: VisjsChangelogEntry[] = [];

  private currentPanelViewInput: PanelViewInput | undefined;

  private changelogIndex = -1;

  constructor(private readonly context: ExtensionContext) {}

  getHtml(webview: Webview): string {
    const visNetworkUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'node_modules', 'vis-network', 'standalone', 'umd', 'vis-network.min.js')
    );
    const ffmpegUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'ffmpeg.min.js')
    );
    const ffmpegCoreUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'node_modules', '@ffmpeg', 'core', 'dist', 'ffmpeg-core.js')
    );
    const filePath = Uri.joinPath(this.context.extensionUri, 'media', 'html', 'visjsDebuggerPanel.html');
    const cssUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'media', 'css', 'visjsDebuggerPanel.css'));
    const codiconsUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
    );
    return readFileSync(filePath.fsPath, 'utf8')
      .replace('{{vis-network.min.js}}', visNetworkUri.toString())
      .replace('{{ffmpeg.min.js}}', ffmpegUri.toString())
      .replace('{{ffmpeg-core.js}}', ffmpegCoreUri.toString())
      .replace('{{visjsDebuggerPanel.css}}', cssUri.toString())
      .replace('{{codicon.css}}', codiconsUri.toString());
  }

  teardownPanelView(): void {
    this.changelog = [];
    this.currentPanelViewInput = undefined;
    this.changelogIndex = -1;
  }

  updatePanel(panelViewInput: PanelViewInput): PanelViewCommand {
    if (!this.currentPanelViewInput) {
      this.currentPanelViewInput = panelViewInput;

      const options: Options = {
        nodes: {
          color: this.defaultNodeColor,
        },
        edges: {
          arrows: 'to',
          color: this.defaultEdgeColor,
        },
        physics: {
          solver: 'repulsion',
          repulsion: {
            nodeDistance: 100,
          },
        },
      };

      return { command: 'initializeVisjs', data: this.parseInputToData(panelViewInput), options };
    }

    const changelogEntry = this.createChangelogEntry(panelViewInput);
    this.changelog.push(changelogEntry);
    this.currentPanelViewInput = panelViewInput;

    if (this.changelogIndex !== -1 && this.changelogIndex < this.changelog.length - 1) {
      return { command: 'noop' };
    }
    this.changelogIndex = -1;
    return { command: 'updateVisjs', data: this.parseChangelogEntryToUpdateInput(changelogEntry) };
  }

  exportPanel(): PanelViewCommand {
    return { command: 'exportVisjs' };
  }

  startRecordingPanel(): PanelViewCommand {
    return { command: 'startRecordingVisjs' };
  }

  stopRecordingPanel(): PanelViewCommand {
    return { command: 'stopRecordingVisjs' };
  }

  stepForward(): PanelViewCommand {
    if (this.changelogIndex === -1 || this.changelogIndex === this.changelog.length) {
      return { command: 'noop' };
    }
    return { command: 'updateVisjs', data: this.parseChangelogEntryToUpdateInput(this.changelog[this.changelogIndex++]) };
  }

  stepBack(): PanelViewCommand {
    if (this.changelog.length === 0 || this.changelogIndex === 0) {
      return { command: 'noop' };
    }
    if (this.changelogIndex === -1) {
      this.changelogIndex = this.changelog.length - 1;
    } else {
      this.changelogIndex--;
    }
    const invertedChangelogEntry = this.invertChangelogEntry(this.changelog[this.changelogIndex]);
    return { command: 'updateVisjs', data: this.parseChangelogEntryToUpdateInput(invertedChangelogEntry) };
  }

  private invertChangelogEntry(entry: VisjsChangelogEntry): VisjsChangelogEntry {
    return {
      nodeChanges: this.invertNodeChanges(entry.nodeChanges),
      edgeChanges: this.invertEdgeChanges(entry.edgeChanges),
    };
  }

  private invertNodeChanges(nodeChanges: ChangedNode[]): ChangedNode[] {
    const invertedNodeChanges: ChangedNode[] = [];
    for (const nodeChange of nodeChanges) {
      let invertedChange: ChangedNode;
      switch (nodeChange.action) {
        case ChangeAction.create:
          invertedChange = {
            action: ChangeAction.delete,
            node: nodeChange.node,
          };
          break;
        case ChangeAction.delete:
          invertedChange = {
            action: ChangeAction.create,
            node: nodeChange.node,
          };
          break;
        case ChangeAction.update:
          invertedChange = {
            action: ChangeAction.update,
            newNode: nodeChange.oldNode,
            oldNode: nodeChange.newNode,
          };
          break;
      }
      invertedNodeChanges.push(invertedChange);
    }
    return invertedNodeChanges;
  }

  private invertEdgeChanges(edgeChanges: ChangedEdge[]): ChangedEdge[] {
    const invertedEdgeChanges: ChangedEdge[] = [];
    for (const edgeChange of edgeChanges) {
      let invertedChange: ChangedEdge;
      switch (edgeChange.action) {
        case ChangeAction.create:
          invertedChange = {
            action: ChangeAction.delete,
            edge: edgeChange.edge,
          };
          break;
        case ChangeAction.delete:
          invertedChange = {
            action: ChangeAction.create,
            edge: edgeChange.edge,
          };
          break;
      }
      invertedEdgeChanges.push(invertedChange);
    }
    return invertedEdgeChanges;
  }

  private parseChangelogEntryToUpdateInput(changelogEntry: VisjsChangelogEntry): VisjsUpdateInput {
    const addNodes: Node[] = [];
    const updateNodes: Node[] = [];
    const deleteNodeIds: string[] = [];
    const addEdges: Edge[] = [];
    const deleteEdgeIds: string[] = [];

    for (const nodeChange of changelogEntry.nodeChanges) {
      switch (nodeChange.action) {
        case ChangeAction.create:
          addNodes.push({ ...nodeChange.node, color: this.changedNodeColor });
          break;
        case ChangeAction.update:
          updateNodes.push({ ...nodeChange.newNode, color: this.changedNodeColor });
          break;
        case ChangeAction.delete:
          deleteNodeIds.push(nodeChange.node.id as string);
          break;
        default:
      }
    }

    for (const edgeChange of changelogEntry.edgeChanges) {
      switch (edgeChange.action) {
        case ChangeAction.create:
          addEdges.push({ ...edgeChange.edge, color: this.changedEdgeColor });
          break;
        case ChangeAction.delete:
          deleteEdgeIds.push(edgeChange.edge.id as string);
          break;
        default:
      }
    }

    return { addNodes, updateNodes, deleteNodeIds, addEdges, deleteEdgeIds };
  }

  private createChangelogEntry(panelViewInput: PanelViewInput): VisjsChangelogEntry {
    const addedVariableIds = Array.from(panelViewInput.variables.keys()).filter(
      (id: string) => !this.currentPanelViewInput?.variables.has(id)
    );
    const deletedVariableIds = Array.from(this.currentPanelViewInput?.variables.keys() || []).filter(
      (id: string) => !panelViewInput.variables.has(id)
    );
    const updatedVariableIds = Array.from(this.currentPanelViewInput?.variables.keys() || []).filter((id: string) =>
      this.variableChanged(this.currentPanelViewInput?.variables.get(id), panelViewInput.variables.get(id))
    );

    const [newNodes, newEdges] = this.buildCreateChangelogEntry(addedVariableIds, panelViewInput);
    const [deletedNodes, deletedEdges] = this.buildDeleteChangelogEntry(deletedVariableIds);
    const [updateNodes, updatedEdges] = this.buildUpdateChangelogEntry(updatedVariableIds, panelViewInput);

    // Create a Set to easily remove duplications
    const nodeChanges = new Set([...newNodes, ...deletedNodes, ...updateNodes]);
    const edgeChanges = new Set([...newEdges, ...deletedEdges, ...updatedEdges]);

    return { nodeChanges: [...nodeChanges], edgeChanges: [...edgeChanges] };
  }

  private buildUpdateChangelogEntry(
    updatedVariableIds: string[],
    panelViewInput: PanelViewInput
  ): [nodes: ChangedNode[], edges: ChangedEdge[]] {
    const nodeChanges: ChangedNode[] = [];
    const edgeChanges: ChangedEdge[] = [];

    for (const variableId of updatedVariableIds) {
      const oldVariable = this.currentPanelViewInput?.variables.get(variableId);
      const newVariable = panelViewInput.variables.get(variableId);
      if (oldVariable && newVariable) {
        this.addNodeAndEdgeChanges(oldVariable, newVariable, nodeChanges, edgeChanges);
      }
    }

    return [nodeChanges, edgeChanges];
  }

  private addNodeAndEdgeChanges(
    oldVariable: PanelViewVariable,
    newVariable: PanelViewVariable,
    nodeChanges: ChangedNode[],
    edgeChanges: ChangedEdge[]
  ): void {
    if (
      oldVariable.value !== newVariable.value ||
      oldVariable.tooltip !== newVariable.tooltip ||
      oldVariable.type !== newVariable.type ||
      oldVariable.name !== newVariable.name ||
      !isEqual(oldVariable.primitiveValues, newVariable.primitiveValues)
    ) {
      nodeChanges.push({
        action: ChangeAction.update,
        oldNode: this.createNode(oldVariable),
        newNode: this.createNode(newVariable),
      });
    }

    const addedIncomingRelations = (newVariable.incomingRelations || []).filter(
      (relation: VariableRelation) =>
        !some(oldVariable.incomingRelations, (rel) => rel.relationName === relation.relationName && rel.parentId === relation.parentId)
    );
    const deletedIncomingRelations = (oldVariable.incomingRelations || []).filter(
      (relation: VariableRelation) =>
        !some(newVariable.incomingRelations, (rel) => rel.relationName === relation.relationName && rel.parentId === relation.parentId)
    );

    for (const relation of addedIncomingRelations) {
      edgeChanges.push({
        action: ChangeAction.create,
        edge: {
          id: `${relation.parentId}to${newVariable.id}withName${relation.relationName}`,
          from: relation.parentId,
          to: newVariable.id,
          label: relation.relationName,
        },
      });
    }

    for (const relation of deletedIncomingRelations) {
      edgeChanges.push({
        action: ChangeAction.delete,
        edge: {
          id: `${relation.parentId}to${newVariable.id}withName${relation.relationName}`,
          from: relation.parentId,
          to: newVariable.id,
          label: relation.relationName,
        },
      });
    }
  }

  private buildCreateChangelogEntry(
    addedVariableIds: string[],
    panelViewInput: PanelViewInput
  ): [nodes: ChangedNode[], edges: ChangedEdge[]] {
    const nodeChanges: ChangedNode[] = [];
    const edgeChanges: ChangedEdge[] = [];

    for (const variableId of addedVariableIds) {
      const variable = panelViewInput.variables.get(variableId);
      if (variable) {
        nodeChanges.push({
          action: ChangeAction.create,
          node: this.createNode(variable),
        });

        for (const relation of variable.incomingRelations || []) {
          edgeChanges.push({
            action: ChangeAction.create,
            edge: {
              id: `${relation.parentId}to${variable.id}withName${relation.relationName}`,
              from: relation.parentId,
              to: variable.id,
              label: relation.relationName,
            },
          });
        }
      }
    }

    return [nodeChanges, edgeChanges];
  }

  private buildDeleteChangelogEntry(deletedVariableIds: string[]): [nodes: ChangedNode[], edges: ChangedEdge[]] {
    const nodeChanges: ChangedNode[] = [];
    const edgeChanges: ChangedEdge[] = [];

    for (const variableId of deletedVariableIds) {
      const variable = this.currentPanelViewInput?.variables.get(variableId);
      if (variable) {
        nodeChanges.push({
          action: ChangeAction.delete,
          node: this.createNode(variable),
        });

        for (const relation of variable.incomingRelations || []) {
          edgeChanges.push({
            action: ChangeAction.delete,
            edge: {
              id: `${relation.parentId}to${variable.id}withName${relation.relationName}`,
              from: relation.parentId,
              to: variable.id,
              label: relation.relationName,
            },
          });
        }
      }
    }

    return [nodeChanges, edgeChanges];
  }

  private variableChanged(v1?: PanelViewVariable, v2?: PanelViewVariable): boolean {
    return Boolean(v1) && Boolean(v2) && !isEqual(v1, v2);
  }

  private parseInputToData(panelViewInput: PanelViewInput): Data {
    const nodes: Node[] = [];
    let edges: Edge[] = [];

    if (panelViewInput?.variables) {
      for (const variable of panelViewInput.variables.values()) {
        nodes.push(this.createNode(variable));
        edges = [...edges, ...this.createEdges(variable)];
      }
    }

    return { nodes, edges };
  }

  private createNode(variable: PanelViewVariable): Node {
    const hasValueAndType = variable.type && variable.name;
    const variableType = variable.type ? `(${variable.type})` : '';
    const topLine = `${variableType}${hasValueAndType ? ' ' : ''}${variable.name ? variable.name : ''}`;
    let bottomSection: string | undefined;
    if (variable.value) {
      bottomSection = variable.value;
    } else if (variable.primitiveValues && variable.primitiveValues.length > 0) {
      bottomSection = variable.primitiveValues.map((value) => `(${value.type}) ${value.name}: ${value.value}`).join('\n');
    }

    let label = '';
    if (topLine.length > 0) {
      label = topLine;
      if (bottomSection && bottomSection.length > 0) {
        label += `:\n${bottomSection}`;
      }
    } else if (bottomSection) {
      label = bottomSection;
    }

    return { id: variable.id, label, title: variable.tooltip };
  }

  private createEdges(variable: PanelViewVariable): Edge[] {
    const edges: Edge[] = [];

    for (const relation of variable.incomingRelations || []) {
      edges.push({
        id: `${relation.parentId}to${variable.id}withName${relation.relationName}`,
        from: relation.parentId,
        to: variable.id,
        label: relation.relationName,
      });
    }

    return edges;
  }
}
