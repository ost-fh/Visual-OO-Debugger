import { readFileSync } from 'fs';
import { isEqual, some } from 'lodash';
import { join } from 'path';
import { Color, Data, Edge, Node, Options } from 'vis-network';
import { ExtensionContext, Uri } from 'vscode';
import { PanelViewInput, PanelViewVariable, VariableRelation } from '../../model/panelViewInput';
import { ChangeAction, ChangedEdge, ChangedNode, VisjsChangelogEntry } from '../../model/visjsChangelogEntry';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { PanelViewCommand, PanelViewProxy } from './panelViewProxy';

export class VisjsPanelView implements PanelViewProxy {
  private readonly defaultNodeColor: Color = {
    border: '#1e88e5',
    background: '#6ab7ff',
    highlight: {
      border: '#1e88e5',
      background: '#6ab7ff',
    },
  };

  private readonly defaultEdgeColor: { color?: string; highlight?: string } = {
    color: '#005cb2',
    highlight: '#005cb2',
  };

  private readonly changedNodeColor: Color = {
    border: '#fdd835',
    background: '#ffff6b',
    highlight: {
      border: '#fdd835',
      background: '#ffff6b',
    },
  };

  private readonly changedEdgeColor: { color?: string; highlight?: string } = {
    color: '#c6a700',
    highlight: '#c6a700',
  };

  private changelog: VisjsChangelogEntry[] = [];

  private currentPanelViewInput: PanelViewInput | undefined;

  constructor(private readonly context: ExtensionContext) {}

  getHtml(): string {
    const visNetworkPath = Uri.file(
      join(this.context.extensionPath, 'node_modules', 'vis-network', 'standalone', 'umd', 'vis-network.min.js')
    ).with({ scheme: 'vscode-resource' });
    const filePath = Uri.file(join(this.context.extensionPath, 'src', 'webview', 'html', 'visjsDebuggerPanel.html'));
    return readFileSync(filePath.fsPath, 'utf8').replace('{{vis-network.min.js}}', visNetworkPath.toString());
  }

  teardownPanelView(): void {
    this.changelog = [];
    this.currentPanelViewInput = undefined;
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

    return { command: 'updateVisjs', data: this.parseChangelogEntryToUpdateInput(changelogEntry) };
  }

  exportPanel(): PanelViewCommand {
    return { command: 'exportVisjs' };
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
          id: `${relation.parentId}to${newVariable.id}`,
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
          id: `${relation.parentId}to${newVariable.id}`,
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
              id: `${relation.parentId}to${variable.id}`,
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
        id: `${relation.parentId}to${variable.id}`,
        from: relation.parentId,
        to: variable.id,
        label: relation.relationName,
      });
    }

    return edges;
  }
}
