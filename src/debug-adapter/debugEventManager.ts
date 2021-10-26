import { v4 as uuidv4 } from 'uuid';
import { debug } from 'vscode';
import { PanelViewInput, PanelViewVariable } from '../model/panelViewInput';
import { Variable } from '../model/variable';
import { DebuggerPanel } from '../webview/debuggerPanel';
import { DebugSessionProxy } from './debugSessionProxy';

export class DebugEventManager {
  private readonly primitiveArrayDataTypes = ['boolean[]', 'char[]', 'byte[]', 'short[]', 'int[]', 'long[]', 'float[]', 'double[]'];
  private readonly primitiveDataTypes = ['boolean', 'char', 'byte', 'short', 'int', 'long', 'float', 'double'];
  private readonly maxValueLength = 30;
  private readonly maxDepth = 10;

  private panelViewInput: PanelViewInput | undefined;

  private debugSessionProxy: DebugSessionProxy | undefined;

  constructor(debuggerPanel: DebuggerPanel) {
    debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: (session) => {
        this.debugSessionProxy = new DebugSessionProxy(session);
        const onDidSendMessage = async (m: Message): Promise<void> => {
          if (m.type === 'event') {
            if (m.event === 'stopped') {
              const threadId = m.body.threadId;
              await this.debugSessionProxy?.setActiveStackFrameId(threadId);
              const currentVariables = await this.debugSessionProxy?.getAllCurrentVariables();
              debuggerPanel.updatePanel(await this.getData(currentVariables));
            }
          }
        };
        return { onDidSendMessage };
      },
    });
  }

  private async getData(variables: Variable[] | undefined): Promise<PanelViewInput> {
    this.panelViewInput = { variables: new Map() };

    // Add primitives of local scope
    for (const variable of variables || []) {
      if (this.primitiveDataTypes.includes(variable.type)) {
        const panelViewVariable: PanelViewVariable = {
          id: uuidv4(),
          name: variable.name,
          type: variable.type,
          value: variable.value,
        };

        this.panelViewInput?.variables.set(panelViewVariable.id, panelViewVariable);
      }
    }

    await this.readDataOfVariables(variables);

    return this.panelViewInput;
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
        } else if (this.primitiveArrayDataTypes.includes(variable.type)) {
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
      const parentVariable = this.panelViewInput?.variables.get(parentId);
      if (parentVariable) {
        parentVariable.references = [...(parentVariable.references || []), { childId: id, relationName: variable.name }];
      }
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

interface Message {
  type: string;
  event?: string;
  body: { threadId: number };
}
