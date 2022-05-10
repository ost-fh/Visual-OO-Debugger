import { readFileSync } from 'fs';
import { isEqual, some } from 'lodash';
import { Color, Data, Edge, Font, Node, Options } from 'vis-network';
import { ExtensionContext, Uri, Webview } from 'vscode';
import { PanelViewInputVariableMap, PanelViewVariable, VariableRelation } from '../../model/panelViewInput';
import { ChangeAction, ChangedEdge, ChangedNode, VisjsChanges } from '../../model/visjsChangelogEntry';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { NodeModulesAccessor } from '../../node-modules-accessor/nodeModulesAccessor';
import { NodeModulesKeys } from '../../node-modules-accessor/nodeModulesKeys';
import { PanelViewCommand, PanelViewProxy } from './panelViewProxy';

export class VisjsPanelView implements PanelViewProxy {
  private defaultNodeColor: Color = {};
  private defaultNodeFont: Font = {};
  private variableNodeColor: Color = {};
  private variableNodeFont: Font = {};
  private defaultEdgeColor: { color?: string; highlight?: string } = {};
  private changedNodeColor: Color = {};
  private changedNodeFont: Font = {};
  private changedVariableColor: Color = {};
  private changedVariableFont: Font = {};
  private changedEdgeColor: { color?: string; highlight?: string } = {};
  private updateColor = false;

  constructor(private readonly context: ExtensionContext) {}

  getHtml(webview: Webview): string {
    const visNetworkUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.visNetworkMinJs))
    );
    const ffmpegUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.ffmpegMinJs))
    );
    const ffmpegCoreUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.ffmpegCoreJs))
    );
    const codiconsUri = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.codiconCss))
    );
    const webviewUiToolkit = webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.webviewUiToolkit))
    );
    const cssUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'media', 'css', 'visjsDebuggerPanel.css'));
    const filePath = Uri.joinPath(this.context.extensionUri, 'media', 'html', 'visjsDebuggerPanel.html');
    return readFileSync(filePath.fsPath, 'utf8')
      .replace('{{vis-network.min.js}}', visNetworkUri.toString())
      .replace('{{ffmpeg.min.js}}', ffmpegUri.toString())
      .replace('{{ffmpeg-core.js}}', ffmpegCoreUri.toString())
      .replace('{{visjsDebuggerPanel.css}}', cssUri.toString())
      .replace('{{codicon.css}}', codiconsUri.toString())
      .replace('{{toolkit.min.js}}', webviewUiToolkit.toString());
  }

  updatePanel(newVariables: PanelViewInputVariableMap, prevVariables?: PanelViewInputVariableMap): PanelViewCommand {
    if (!prevVariables || this.updateColor) {
      this.updateColor = false;
      const options: Options = {
        nodes: {
          shape: 'box',
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
        groups: {
          default: {
            color: this.defaultNodeColor,
            font: this.defaultNodeFont,
          },
          variable: {
            color: this.variableNodeColor,
            font: this.variableNodeFont,
          },
          changed: {
            color: this.changedNodeColor,
            font: this.changedNodeFont,
          },
          changedVariable: {
            color: this.changedVariableColor,
            font: this.changedVariableFont,
          },
        },
      };

      return { command: 'initializeVisjs', data: this.parseInputToData(newVariables), options };
    }

    const changes = this.createChanges(newVariables, prevVariables);
    return { command: 'updateVisjs', data: this.parseChangesToUpdateInput(changes) };
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

  private parseChangesToUpdateInput(changes: VisjsChanges): VisjsUpdateInput {
    const addNodes: Node[] = [];
    const updateNodes: Node[] = [];
    const deleteNodeIds: string[] = [];
    const addEdges: Edge[] = [];
    const deleteEdgeIds: string[] = [];

    for (const nodeChange of changes.nodeChanges) {
      switch (nodeChange.action) {
        case ChangeAction.create:
          addNodes.push({
            ...nodeChange.node,
            group: nodeChange.node.group === 'variable' ? 'changedVariable' : 'changed',
          });
          break;
        case ChangeAction.update:
          updateNodes.push({
            ...nodeChange.newNode,
            group: nodeChange.newNode.group === 'variable' ? 'changedVariable' : 'changed',
          });
          break;
        case ChangeAction.delete:
          deleteNodeIds.push(nodeChange.node.id as string);
          break;
        default:
      }
    }

    for (const edgeChange of changes.edgeChanges) {
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

  private createChanges(newVariables: PanelViewInputVariableMap, prevVariables: PanelViewInputVariableMap): VisjsChanges {
    const addedVariableIds = Array.from(newVariables.keys()).filter((id: string) => !prevVariables?.has(id));
    const deletedVariableIds = Array.from(prevVariables?.keys() || []).filter((id: string) => !newVariables.has(id));
    const updatedVariableIds = Array.from(prevVariables?.keys() || []).filter((id: string) =>
      this.variableChanged(prevVariables?.get(id), newVariables.get(id))
    );

    const [newNodes, newEdges] = this.buildCreateChanges(addedVariableIds, newVariables);
    const [deletedNodes, deletedEdges] = this.buildDeleteChanges(deletedVariableIds, prevVariables);
    const [updateNodes, updatedEdges] = this.buildUpdateChanges(updatedVariableIds, newVariables, prevVariables);

    // Create a Set to easily remove duplications
    const nodeChanges = new Set([...newNodes, ...deletedNodes, ...updateNodes]);
    const edgeChanges = new Set([...newEdges, ...deletedEdges, ...updatedEdges]);

    return { nodeChanges: [...nodeChanges], edgeChanges: [...edgeChanges] };
  }

  private buildUpdateChanges(
    updatedVariableIds: string[],
    newVariables: PanelViewInputVariableMap,
    prevVariables: PanelViewInputVariableMap
  ): [nodes: ChangedNode[], edges: ChangedEdge[]] {
    const nodeChanges: ChangedNode[] = [];
    const edgeChanges: ChangedEdge[] = [];

    for (const variableId of updatedVariableIds) {
      const oldVariable = prevVariables?.get(variableId);
      const newVariable = newVariables.get(variableId);
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

    if (
      oldVariable.value !== newVariable.value ||
      oldVariable.tooltip !== newVariable.tooltip ||
      oldVariable.type !== newVariable.type ||
      oldVariable.name !== newVariable.name ||
      !isEqual(oldVariable.primitiveValues, newVariable.primitiveValues) ||
      (edgeChanges.some((changedEdge) => changedEdge.edge.from === oldVariable.id) && oldVariable.id.startsWith('variable_'))
    ) {
      nodeChanges.push({
        action: ChangeAction.update,
        oldNode: this.createNode(oldVariable),
        newNode: this.createNode(newVariable),
      });
    }
  }

  private buildCreateChanges(
    addedVariableIds: string[],
    variables: PanelViewInputVariableMap
  ): [nodes: ChangedNode[], edges: ChangedEdge[]] {
    const nodeChanges: ChangedNode[] = [];
    const edgeChanges: ChangedEdge[] = [];

    for (const variableId of addedVariableIds) {
      const variable = variables.get(variableId);
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

  private buildDeleteChanges(
    deletedVariableIds: string[],
    prevVariables: PanelViewInputVariableMap
  ): [nodes: ChangedNode[], edges: ChangedEdge[]] {
    const nodeChanges: ChangedNode[] = [];
    const edgeChanges: ChangedEdge[] = [];

    for (const variableId of deletedVariableIds) {
      const variable = prevVariables?.get(variableId);
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

  private parseInputToData(variables: PanelViewInputVariableMap): Data {
    const nodes: Node[] = [];
    let edges: Edge[] = [];

    for (const variable of variables.values()) {
      nodes.push(this.createNode(variable));
      edges = [...edges, ...this.createEdges(variable)];
    }

    return { nodes, edges };
  }

  private createNode(variable: PanelViewVariable): Node {
    const hasValueAndType = variable.type && variable.name;
    const variableType = variable.type ? `(${variable.type})` : '';
    const group = !variable.type && variable.name ? 'variable' : 'default';
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

    return { id: variable.id, label, title: variable.tooltip, group };
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

  public setPanelStyles(colorMap: Map<string, string>): void {
    this.updateColor = true;
    this.defaultNodeColor = {
      border: colorMap.get('defaultColorBorder'),
      background: colorMap.get('defaultColor'),
      highlight: {
        border: colorMap.get('defaultColorBorder'),
        background: colorMap.get('defaultColor'),
      },
    };

    this.defaultNodeFont = {
      color: colorMap.get('defaultColorFont'),
    };

    this.variableNodeColor = {
      border: colorMap.get('variableColorBorder'),
      background: colorMap.get('variableColor'),
      highlight: {
        border: colorMap.get('variableColorBorder'),
        background: colorMap.get('variableColor'),
      },
    };

    this.variableNodeFont = {
      color: colorMap.get('variableColorFont'),
    };

    this.defaultEdgeColor = {
      color: colorMap.get('defaultColorBorder'),
      highlight: colorMap.get('defaultColorBorder'),
    };

    this.changedNodeColor = {
      border: colorMap.get('changedColorBorder'),
      background: colorMap.get('changedColor'),
      highlight: {
        border: colorMap.get('changedColorBorder'),
        background: colorMap.get('changedColor'),
      },
    };

    this.changedNodeFont = {
      color: colorMap.get('changedColorFont'),
    };

    this.changedVariableColor = {
      border: colorMap.get('changedVariableColorBorder'),
      background: colorMap.get('changedVariableColor'),
      highlight: {
        border: colorMap.get('changedVariableColorBorder'),
        background: colorMap.get('changedVariableColor'),
      },
    };

    this.changedVariableFont = {
      color: colorMap.get('changedVariableColorFont'),
    };

    this.changedEdgeColor = {
      color: colorMap.get('changedColorBorder'),
      highlight: colorMap.get('changedColorBorder'),
    };
  }
}
