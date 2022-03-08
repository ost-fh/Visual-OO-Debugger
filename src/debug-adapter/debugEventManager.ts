import * as hash from 'object-hash';
import { debug } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { PanelViewInput, PanelViewVariable } from '../model/panelViewInput';
import { DebuggerPanel } from '../webview/debuggerPanel';
import { DebugSessionProxy } from './debugSessionProxy';

export class DebugEventManager {
  public static readonly variablePrefix = 'variable_';
  public static readonly objectPrefix = 'object_';
  public static readonly nullPrefix = 'null_';

  private readonly primitiveArrayDataTypes = ['boolean[]', 'char[]', 'byte[]', 'short[]', 'int[]', 'long[]', 'float[]', 'double[]'];
  private readonly primitiveDataTypes = ['boolean', 'char', 'byte', 'short', 'int', 'long', 'float', 'double'];
  private readonly maxValueLength = 30;
  private readonly maxDepth = 10;

  private callSeq: number | undefined;

  private debugSessionProxy: DebugSessionProxy | undefined;

  registerDebuggerPanel(debuggerPanel: DebuggerPanel): void {
    debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: (session) => {
        this.debugSessionProxy = new DebugSessionProxy(session);
        const onDidSendMessage = async (m: DebugProtocol.ProtocolMessage): Promise<void> => {
          if (m.type === 'event' && (m as DebugProtocol.Event).event === 'stopped') {
            this.callSeq = m.seq;

            const threadId = (m as DebugProtocol.StoppedEvent).body.threadId;
            await this.debugSessionProxy?.setActiveStackFrameId(threadId ?? 0);
            const currentVariables = await this.debugSessionProxy?.getAllCurrentVariables();
            const data = await this.getData(currentVariables);

            if (this.callSeq === m.seq) {
              debuggerPanel.updatePanel(data);
            }
          }
        };
        return { onDidSendMessage };
      },
    });
  }

  private async getData(variables: DebugProtocol.Variable[] | undefined): Promise<PanelViewInput> {
    const panelViewInput = { variables: new Map() };

    // Add primitives of local scope
    for (const variable of variables || []) {
      if (variable.type && this.primitiveDataTypes.includes(variable.type)) {
        const panelViewVariable: PanelViewVariable = {
          id: `${DebugEventManager.variablePrefix}${hash(variable)}`,
          name: variable.name,
          type: variable.type,
          value: variable.value,
        };

        panelViewInput.variables.set(panelViewVariable.id, panelViewVariable);
      }
    }

    await this.readDataOfVariables(variables, panelViewInput);

    return panelViewInput;
  }

  private async readDataOfVariables(
    variables: DebugProtocol.Variable[] | undefined,
    panelViewInput: PanelViewInput,
    parentId?: string | undefined,
    maxDepth = this.maxDepth
  ): Promise<void> {
    if (variables === undefined || maxDepth === 0) {
      return;
    }

    for (const variable of variables) {
      if (variable.type && this.primitiveDataTypes.includes(variable.type)) {
        this.addPrimitiveValueToParent(variable, parentId, panelViewInput);
      } else {
        await this.prepareObjectData(variable, maxDepth, parentId, panelViewInput);
      }
    }
  }

  private addPrimitiveValueToParent(variable: DebugProtocol.Variable, parentId: string | undefined, panelViewInput: PanelViewInput): void {
    if (parentId) {
      const panelViewVariable = panelViewInput.variables.get(parentId);
      if (panelViewVariable && variable.type) {
        panelViewVariable.primitiveValues = [
          ...(panelViewVariable.primitiveValues || []),
          { type: variable.type, name: variable.name, value: variable.value },
        ];
      }
    }
  }

  private async prepareObjectData(
    variable: DebugProtocol.Variable,
    maxDepth: number,
    parentId: string | undefined,
    panelViewInput: PanelViewInput
  ): Promise<void> {
    let isNewAndObject = false;
    const id = variable.value === 'null' ? variable.value : `${DebugEventManager.objectPrefix}${variable.value}`;
    let panelViewVariable = panelViewInput.variables.get(id);
    if (panelViewVariable === undefined) {
      [panelViewVariable, isNewAndObject] = await this.createPanelViewVariable(id, variable);

      panelViewInput.variables.set(panelViewVariable.id, panelViewVariable);
    }

    if (parentId) {
      panelViewVariable.incomingRelations = [
        ...(panelViewVariable.incomingRelations || []),
        { parentId: parentId, relationName: variable.name },
      ];
      const parentVariable = panelViewInput.variables.get(parentId);
      if (parentVariable) {
        parentVariable.references = [...(parentVariable.references || []), { childId: id, relationName: variable.name }];
      }
    } else {
      const namedVariable = this.createVariableEntryForNamedVariable(variable, id);
      panelViewInput.variables.set(namedVariable.id, namedVariable);
      panelViewVariable.incomingRelations = [
        ...(panelViewVariable.incomingRelations || []),
        { parentId: namedVariable.id, relationName: '' },
      ];
    }

    if (isNewAndObject && variable.variablesReference) {
      const childVariables = await this.debugSessionProxy?.getVariables(variable.variablesReference);
      await this.readDataOfVariables(childVariables, panelViewInput, id, maxDepth - 1);
    }
  }

  private async createPanelViewVariable(
    id: string,
    variable: DebugProtocol.Variable
  ): Promise<[variable: PanelViewVariable, isNewAndObject: boolean]> {
    let isNewAndObject = false;
    const panelViewVariable: PanelViewVariable = { id: id !== 'null' ? id : `${DebugEventManager.variablePrefix}${hash(variable)}` };

    if (variable.type === 'null') {
      panelViewVariable.value = 'null';
      panelViewVariable.id = `${DebugEventManager.nullPrefix}${hash(variable)}`;
      return [panelViewVariable, isNewAndObject];
    }

    panelViewVariable.type = variable.type;
    if (variable.type === 'String') {
      [panelViewVariable.value, panelViewVariable.tooltip] = this.prepareStringData(variable);
    } else if (variable.type && this.primitiveArrayDataTypes.includes(variable.type)) {
      [panelViewVariable.value, panelViewVariable.tooltip] = await this.preparePrimitiveArrayData(variable, ',');
    } else if (variable.type === 'String[]') {
      [panelViewVariable.value, panelViewVariable.tooltip] = await this.preparePrimitiveArrayData(variable, '","');
    } else {
      isNewAndObject = true;
    }

    return [panelViewVariable, isNewAndObject];
  }

  private createVariableEntryForNamedVariable(variable: DebugProtocol.Variable, referencedObjectId: string): PanelViewVariable {
    return {
      id: `${DebugEventManager.variablePrefix}${variable.name}`,
      name: variable.name,
      references: [{ childId: referencedObjectId, relationName: '' }],
    };
  }

  private async preparePrimitiveArrayData(
    variable: DebugProtocol.Variable,
    delimiter: string
  ): Promise<[label: string, tooltip: string | undefined]> {
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

  private prepareStringData(variable: DebugProtocol.Variable): [label: string, tooltip: string | undefined] {
    let tooltip;
    let value = variable.value;
    if (value.length > this.maxValueLength) {
      const shorterVersion = value.substr(0, this.maxValueLength - 2);
      value = `"${shorterVersion.substr(1, shorterVersion.lastIndexOf(' '))}\u2026"`;
      tooltip = variable.value;
    }

    return [value, tooltip];
  }

  private renderAsArray(variables: DebugProtocol.Variable[]): string {
    return `[${variables.map((v) => v.value).join(',')}]`;
  }
}
