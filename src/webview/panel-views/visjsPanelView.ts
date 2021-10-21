import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Data, Edge, Node, Options } from 'vis-network';
import { ExtensionContext, Uri } from 'vscode';
import { DebugSessionProxy } from '../../debug-adapter/debugSessionProxy';
import { Variable } from '../../model/variable';
import { VisjsPanelViewInput, VisjsPanelViewVariable } from '../../model/visjsPanelViewInput';
import { PanelViewProxy, UpdatePanelViewCommand } from './panelViewProxy';

export class VisjsPanelView implements PanelViewProxy {
  private readonly primitiveDataArray = ['boolean[]', 'char[]', 'byte[]', 'short[]', 'int[]', 'long[]', 'float[]', 'double[]'];
  private readonly primitiveDataTypes = ['boolean', 'char', 'byte', 'short', 'int', 'long', 'float', 'double'];
  private readonly maxValueLength = 30;
  private readonly maxDepth = 10;

  private panelViewInput: VisjsPanelViewInput | undefined;

  private debugSessionProxy: DebugSessionProxy | undefined;

  constructor(private readonly context: ExtensionContext) {}

  getHtml(): string {
    const filePath = Uri.file(join(this.context.extensionPath, 'src', 'webview', 'html', 'visjsDebuggerPanel.html'));
    return readFileSync(filePath.fsPath, 'utf8');
  }

  async updatePanel(debugSessionProxy: DebugSessionProxy): Promise<UpdatePanelViewCommand> {
    this.debugSessionProxy = debugSessionProxy;
    const currentVariables = await this.debugSessionProxy.getAllCurrentVariables();
    const data = await this.getData(currentVariables);

    const options: Options = {
      edges: {
        arrows: 'to',
      },
      physics: {
        barnesHut: {
          avoidOverlap: 0.1,
        },
      },
    };

    return { command: 'updateVisjs', data, options };
  }

  private async getData(variables: Variable[] | undefined): Promise<Data> {
    this.panelViewInput = { variables: new Map() };

    // Add primitives of local scope
    for (const variable of variables || []) {
      if (this.primitiveDataTypes.includes(variable.type)) {
        const panelViewVariable: VisjsPanelViewVariable = {
          id: uuidv4(),
          name: variable.name,
          type: variable.type,
          value: variable.value,
        };

        this.panelViewInput?.variables.set(panelViewVariable.id, panelViewVariable);
      }
    }

    await this.readDataOfVariables(variables);

    return this.parseInputToData();
  }

  private parseInputToData(): Data {
    const nodes: Node[] = [];
    let edges: Edge[] = [];

    if (this.panelViewInput?.variables) {
      for (const variable of this.panelViewInput.variables.values()) {
        nodes.push(this.createNode(variable));
        edges = [...edges, ...this.createEdges(variable)];
      }
    }

    return { nodes, edges };
  }

  private createNode(variable: VisjsPanelViewVariable): Node {
    const hasValueAndType = variable.type && variable.name;
    const topLine = `${variable.type ? `(${variable.type})` : ''}${hasValueAndType ? ' ' : ''}${variable.name ? `${variable.name}:` : ''}`;
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
        label += `\n${bottomSection}`;
      }
    } else if (bottomSection) {
      label = bottomSection;
    }

    return { id: variable.id, label, title: variable.tooltip };
  }

  private createEdges(variable: VisjsPanelViewVariable): Edge[] {
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

  private async readDataOfVariables(
    variables: Variable[] | undefined,
    parentId?: string | undefined,
    maxDepth = this.maxDepth
  ): Promise<void> {
    if (variables === undefined || maxDepth === 0) {
      return;
    }

    for (const variable of variables) {
      if (this.primitiveDataTypes.includes(variable.type)) {
        this.addPrimitiveValueToParent(variable, parentId);
      } else {
        await this.prepareObjectData(variable, maxDepth, parentId);
      }
    }
  }

  private addPrimitiveValueToParent(variable: Variable, parentId: string | undefined): void {
    if (parentId) {
      const panelViewVariable = this.panelViewInput?.variables.get(parentId);
      if (panelViewVariable) {
        panelViewVariable.primitiveValues = [
          ...(panelViewVariable.primitiveValues || []),
          { type: variable.type, name: variable.name, value: variable.value },
        ];
      }
    }
  }

  private async prepareObjectData(variable: Variable, maxDepth: number, parentId: string | undefined): Promise<void> {
    let isNewAndObject = false;
    const id = variable.value;
    let panelViewVariable = this.panelViewInput?.variables.get(id);
    if (panelViewVariable === undefined) {
      panelViewVariable = { id: id !== 'null' ? id : uuidv4() };
      if (!parentId) {
        panelViewVariable.name = variable.name;
      }

      if (variable.type !== 'null') {
        panelViewVariable.type = variable.type;
        if (variable.type === 'String') {
          [panelViewVariable.value, panelViewVariable.tooltip] = this.prepareStringData(variable);
        } else if (this.primitiveDataArray.includes(variable.type)) {
          [panelViewVariable.value, panelViewVariable.tooltip] = await this.preparePrimitiveArrayData(variable, ',');
        } else if (variable.type === 'String[]') {
          [panelViewVariable.value, panelViewVariable.tooltip] = await this.preparePrimitiveArrayData(variable, '","');
        } else {
          isNewAndObject = true;
        }
      } else {
        panelViewVariable.value = 'null';
      }

      this.panelViewInput?.variables.set(panelViewVariable.id, panelViewVariable);
    }

    if (parentId) {
      panelViewVariable.incomingRelations = [
        ...(panelViewVariable.incomingRelations || []),
        { parentId: parentId, relationName: variable.name },
      ];
    }

    if (isNewAndObject && variable.variablesReference) {
      const childVariables = await this.debugSessionProxy?.getVariables(variable.variablesReference);
      await this.readDataOfVariables(childVariables, id, maxDepth - 1);
    }
  }

  private async preparePrimitiveArrayData(variable: Variable, delimiter: string): Promise<[label: string, tooltip: string | undefined]> {
    const childVariables = await this.debugSessionProxy?.getVariables(variable.variablesReference);
    const fullLengthArray = childVariables ? this.renderAsArray(childVariables) : '[]';

    let value = fullLengthArray;
    let tooltip;
    if (fullLengthArray.length > this.maxValueLength) {
      const shorterVersion = fullLengthArray.substr(0, this.maxValueLength - 2);
      value = `[${shorterVersion.substr(1, shorterVersion.lastIndexOf(delimiter))}\u2026]`;
      tooltip = fullLengthArray;
    }

    return [value, tooltip];
  }

  private prepareStringData(variable: Variable): [label: string, tooltip: string | undefined] {
    let tooltip;
    let value = variable.value;
    if (value.length > this.maxValueLength) {
      const shorterVersion = value.substr(0, this.maxValueLength - 2);
      value = `"${shorterVersion.substr(1, shorterVersion.lastIndexOf(' '))}\u2026"`;
      tooltip = variable.value;
    }

    return [value, tooltip];
  }

  private renderAsArray(variables: Variable[]): string {
    return `[${variables.map((v) => v.value).join(',')}]`;
  }
}
