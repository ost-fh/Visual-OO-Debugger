import { DebugProtocol } from '@vscode/debugprotocol';
import { debug, DebugAdapterTracker, DebugSession, ProviderResult, window } from 'vscode';
import { AbstractDataExtractor } from '../data-extractor/abstractDataExtractor';
import { JavaDataExtractor } from '../data-extractor/javaDataExtractor';
import { PanelViewInput, PanelViewStackFrame, PanelViewVariable } from '../model/panelViewInput';
import { DebuggerPanel } from '../webview/debuggerPanel';
import { DebugSessionProxy } from './debugSessionProxy';

export class DebugEventManager {
  private readonly maxValueLength = 30;
  private readonly maxDepth = 10;

  registerDebuggerPanel(debuggerPanel: DebuggerPanel): void {
    debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: (session: DebugSession): ProviderResult<DebugAdapterTracker> => {
        const debugSessionProxy = new DebugSessionProxy(session);
        const dataExtractor = this.getDataExtractor(session);
        let callSeq: number | undefined;
        const onDidSendMessage = (m: DebugProtocol.ProtocolMessage): void => {
          try {
            if (m.type === 'response' && (m as DebugProtocol.Response).command === 'initialize' && (m as DebugProtocol.Response).success) {
              callSeq = undefined;
              debuggerPanel.reset();
            } else if (m.type === 'event' && (m as DebugProtocol.Event).event === 'stopped') {
              callSeq = m.seq;

              const threadId = (m as DebugProtocol.StoppedEvent).body.threadId;
              void debugSessionProxy.loadStackFrames(threadId ?? 0).then(() => {
                const currentCallStack = debugSessionProxy.getCallStack();
                if (currentCallStack !== undefined) {
                  void this.getData(currentCallStack, debugSessionProxy, dataExtractor).then((data: PanelViewInput) => {
                    if (callSeq === m.seq) {
                      debuggerPanel.updatePanel(data);
                    }
                  });
                }
              });
            }
          } catch (e) {
            void window.showErrorMessage('Visual OO Debugger lost connection to the debugger');
            throw e;
          }
        };
        return { onDidSendMessage };
      },
    });
  }

  private getDataExtractor(session: DebugSession): AbstractDataExtractor {
    if (session.type === 'java') {
      return new JavaDataExtractor();
    }
    throw new Error(`${session.type} is not supported by VOOD`);
  }

  private async getData(
    stackFrames: DebugProtocol.StackFrame[],
    debugSessionProxy: DebugSessionProxy,
    dataExtractor: AbstractDataExtractor
  ): Promise<PanelViewInput> {
    const panelViewInput: PanelViewInput = { callstack: [] };
    for (const stackFrame of stackFrames) {
      panelViewInput.callstack.push(await this.getStackFrameData(stackFrame, debugSessionProxy, dataExtractor));
    }
    return panelViewInput;
  }

  private async getStackFrameData(
    stackFrame: DebugProtocol.StackFrame,
    debugSessionProxy: DebugSessionProxy,
    dataExtractor: AbstractDataExtractor
  ): Promise<PanelViewStackFrame> {
    const panelViewStackFrame = { name: stackFrame?.name, variables: new Map() };
    const variables = await debugSessionProxy.getAllVariables(stackFrame?.id);
    // Add primitives of local scope
    for (const variable of variables || []) {
      if (dataExtractor.isPrimitiveVariable(variable)) {
        const panelViewVariable: PanelViewVariable = dataExtractor.createPrimitiveVariable(variable);
        panelViewStackFrame.variables.set(panelViewVariable.id, panelViewVariable);
      }
    }

    await this.readDataOfVariables(variables, panelViewStackFrame, debugSessionProxy, dataExtractor);

    return panelViewStackFrame;
  }

  private async readDataOfVariables(
    variables: DebugProtocol.Variable[] | undefined,
    panelViewStackFrame: PanelViewStackFrame,
    debugSessionProxy: DebugSessionProxy,
    dataExtractor: AbstractDataExtractor,
    parentId?: string | undefined,
    maxDepth = this.maxDepth
  ): Promise<void> {
    if (variables === undefined || maxDepth === 0) {
      return;
    }

    for (const variable of variables) {
      if (dataExtractor.isPrimitiveVariable(variable)) {
        this.addPrimitiveValueToParent(variable, parentId, panelViewStackFrame, dataExtractor);
      } else {
        await this.prepareObjectData(variable, maxDepth, parentId, panelViewStackFrame, debugSessionProxy, dataExtractor);
      }
    }
  }

  private addPrimitiveValueToParent(
    variable: DebugProtocol.Variable,
    parentId: string | undefined,
    panelViewStackFrame: PanelViewStackFrame,
    dataExtractor: AbstractDataExtractor
  ): void {
    if (parentId) {
      const panelViewVariable = panelViewStackFrame.variables.get(parentId);
      if (panelViewVariable) {
        panelViewVariable.primitiveValues = [...(panelViewVariable.primitiveValues || []), dataExtractor.createPrimitiveValue(variable)];
      }
    }
  }

  private async prepareObjectData(
    variable: DebugProtocol.Variable,
    maxDepth: number,
    parentId: string | undefined,
    panelViewStackFrame: PanelViewStackFrame,
    debugSessionProxy: DebugSessionProxy,
    dataExtractor: AbstractDataExtractor
  ): Promise<void> {
    let isNewAndObject = false;
    const id = dataExtractor.createVariableId(variable);
    let panelViewVariable = panelViewStackFrame.variables.get(id);
    if (panelViewVariable === undefined) {
      [panelViewVariable, isNewAndObject] = await this.createPanelViewVariable(id, variable, debugSessionProxy, dataExtractor);

      panelViewStackFrame.variables.set(panelViewVariable.id, panelViewVariable);
    }

    if (parentId) {
      panelViewVariable.incomingRelations = [
        ...(panelViewVariable.incomingRelations || []),
        dataExtractor.createVariableRelation(parentId, variable),
      ];
      const parentVariable = panelViewStackFrame.variables.get(parentId);
      if (parentVariable) {
        parentVariable.references = [...(parentVariable.references || []), dataExtractor.createVariableReference(id, variable)];
      }
    } else {
      const namedVariable = dataExtractor.createVariableEntryForNamedVariable(id, variable);
      panelViewStackFrame.variables.set(namedVariable.id, namedVariable);
      panelViewVariable.incomingRelations = [
        ...(panelViewVariable.incomingRelations || []),
        dataExtractor.createVariableRelation(namedVariable.id, undefined),
      ];
    }

    if (isNewAndObject && variable.variablesReference) {
      let childVariables = await debugSessionProxy.getVariables(variable.variablesReference);
      if (variable.presentationHint?.lazy && childVariables?.length > 0) {
        childVariables = await debugSessionProxy.getVariables(childVariables[0].variablesReference);
      }
      await this.readDataOfVariables(childVariables, panelViewStackFrame, debugSessionProxy, dataExtractor, id, maxDepth - 1);
    }
  }

  private async createPanelViewVariable(
    id: string,
    variable: DebugProtocol.Variable,
    debugSessionProxy: DebugSessionProxy,
    dataExtractor: AbstractDataExtractor
  ): Promise<[variable: PanelViewVariable, isNewAndObject: boolean]> {
    let isNewAndObject = false;
    const panelViewVariable: PanelViewVariable = { id };

    if (dataExtractor.isNullVariable(variable)) {
      panelViewVariable.value = dataExtractor.nullText;
      return [panelViewVariable, isNewAndObject];
    }

    panelViewVariable.type = variable.type;
    if (dataExtractor.isStringVariable(variable)) {
      [panelViewVariable.value, panelViewVariable.tooltip] = this.prepareStringData(variable);
    } else if (dataExtractor.isPrimitiveArrayVariable(variable)) {
      [panelViewVariable.value, panelViewVariable.tooltip] = await this.prepareArrayData(variable, ',', debugSessionProxy, dataExtractor);
    } else if (dataExtractor.isStringArrayVariable(variable)) {
      [panelViewVariable.value, panelViewVariable.tooltip] = await this.prepareArrayData(variable, '","', debugSessionProxy, dataExtractor);
    } else {
      isNewAndObject = true;
    }

    return [panelViewVariable, isNewAndObject];
  }

  private async prepareArrayData(
    variable: DebugProtocol.Variable,
    delimiter: string,
    debugSessionProxy: DebugSessionProxy,
    dataExtractor: AbstractDataExtractor
  ): Promise<[label: string, tooltip: string | undefined]> {
    const childVariables = await debugSessionProxy.getVariables(variable.variablesReference);
    const fullLengthArray = dataExtractor.createArrayString(childVariables);

    let value = fullLengthArray;
    let tooltip;
    if (fullLengthArray.length > this.maxValueLength) {
      const shorterVersion = fullLengthArray.substring(0, this.maxValueLength - 1);
      value = `[${shorterVersion.substring(1, shorterVersion.lastIndexOf(delimiter) + 1)}\u2026]`;
      tooltip = fullLengthArray;
    }

    return [value, tooltip];
  }

  private prepareStringData(variable: DebugProtocol.Variable): [label: string, tooltip: string | undefined] {
    let tooltip;
    let value = variable.value;
    if (value.length > this.maxValueLength) {
      const shorterVersion = value.substring(0, this.maxValueLength - 1);
      value = `"${shorterVersion.substring(1, shorterVersion.lastIndexOf(' ') + 1)}\u2026"`;
      tooltip = variable.value;
    }

    return [value, tooltip];
  }
}
