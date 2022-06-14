import { ExtensionContext } from 'vscode';
import { Color, Data, Edge, Font, Node, Options } from 'vis-network';
import { isEqual, some } from 'lodash';
import { NodeColor, PanelViewColors, PanelViewInputVariableMap, PanelViewVariable, VariableRelation } from '../../model/panelViewInput';
import { ChangeAction, ChangedEdge, ChangedNode, VisjsChanges } from '../../model/visjsChangelogEntry';
import { VisjsUpdateInput } from '../../model/visjsUpdateInput';
import { AbstractPanelViewProxy } from './abstractPanelViewProxy';
import { VisjsGroupName } from './visjsGroupName';

interface VisjsGroup {
  color: Color;
  font?: Font;
}

type VisjsGroupsByName = Record<VisjsGroupName, VisjsGroup>;

interface EdgeColor {
  color?: string;
  highlight?: string;
}

export class VisjsPanelViewProxy extends AbstractPanelViewProxy<Data, Options, VisjsUpdateInput> {
  protected readonly debuggerPanelPrefix = 'visjs';
  protected readonly extraCssNodeModuleKeys = [];

  private visjsGroupsByName?: VisjsGroupsByName;
  private defaultEdgeColor: EdgeColor = {};
  private changedEdgeColor: EdgeColor = {};

  constructor(context: ExtensionContext) {
    super(context);
  }

  protected getRenderingAreaData(variables: PanelViewInputVariableMap): Data {
    return this.parseInputToData(variables);
  }

  protected getRenderingAreaOptions(): Options {
    return {
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
      groups: this.visjsGroupsByName,
    };
  }

  protected getRenderingAreaUpdateData(
    newVariables: PanelViewInputVariableMap,
    prevVariables: Map<string, PanelViewVariable>
  ): VisjsUpdateInput {
    return this.parseChangesToUpdateInput(this.createChanges(newVariables, prevVariables));
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
            group: ((nodeChange.node.group as VisjsGroupName) === 'defaultVariable' ? 'changedVariable' : 'changedNode') as VisjsGroupName,
          });
          break;
        case ChangeAction.update:
          updateNodes.push({
            ...nodeChange.newNode,
            group: ((nodeChange.newNode.group as VisjsGroupName) === 'defaultVariable'
              ? 'changedVariable'
              : 'changedNode') as VisjsGroupName,
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
    const group: VisjsGroupName = !variable.type && variable.name ? 'defaultVariable' : 'defaultNode';
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

  canRecordGif(): boolean {
    return true;
  }

  canRecordWebm(): boolean {
    return true;
  }

  protected setColors(viewColors: PanelViewColors): void {
    this.visjsGroupsByName = (['defaultNode', 'defaultVariable', 'changedNode', 'changedVariable'] as VisjsGroupName[]).reduce(
      (groups, name) => ({
        ...groups,
        [name]: VisjsPanelViewProxy.getVisjsGroup(viewColors[`${name}Color`]),
      }),
      {}
    ) as VisjsGroupsByName;
    this.defaultEdgeColor = VisjsPanelViewProxy.getEdgeColor(viewColors.defaultNodeColor);
    this.changedEdgeColor = VisjsPanelViewProxy.getEdgeColor(viewColors.changedNodeColor);
  }

  private static getVisjsGroup(nodeColor: NodeColor): VisjsGroup {
    return {
      color: VisjsPanelViewProxy.getColor(nodeColor),
      font: VisjsPanelViewProxy.getFont(nodeColor),
    };
  }

  private static getColor(nodeColor: NodeColor): Color {
    return {
      border: nodeColor.border,
      background: nodeColor.background,
      highlight: {
        border: nodeColor.border,
        background: nodeColor.background,
      },
    };
  }

  private static getFont(nodeColor: NodeColor): Font {
    return {
      color: nodeColor.font,
    };
  }

  private static getEdgeColor(nodeColor: NodeColor): EdgeColor {
    return {
      color: nodeColor.border,
      highlight: nodeColor.border,
    };
  }
}
