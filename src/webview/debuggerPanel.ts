import { commands, ExtensionContext, Memento, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { isEqual } from 'lodash';
import { NodeColor, PanelViewColors, PanelViewInput, PanelViewInputVariableMap } from '../model/panelViewInput';
import { NodeModulesAccessor } from '../node-modules-accessor/nodeModulesAccessor';
import { ObjectDiagramFileSaverFactory } from '../object-diagram/logic/export/objectDiagramFileSaverFactory';
import { PanelViewInputObjectDiagramReader } from '../object-diagram/logic/reader/panelViewInputObjectDiagramReader';
import { ObjectDiagram } from '../object-diagram/model/objectDiagram';
import { FileSaver } from '../object-diagram/utilities/export/fileSaver';
import { MementoAccessor } from '../object-diagram/utilities/storage/mementoAccessor';
import { PanelViewCommand, PanelViewProxy } from './panel-views/panelViewProxy';
import { DebuggerPanelMessage } from './panel-views/debuggerPanelMessage';
import * as tinycolor from 'tinycolor2';

export class DebuggerPanel {
  private viewPanel: WebviewPanel | undefined;

  private currentPanelViewInput: PanelViewInput | undefined;

  private inputHistory: PanelViewInputVariableMap[] = [];

  private currentVariables: PanelViewInputVariableMap | undefined;

  private historyIndex = -1;

  private readonly plantUmlObjectDiagramFileSaver: FileSaver;

  private readonly graphVizObjectDiagramFileSaver: FileSaver;

  private viewColors: PanelViewColors | undefined;

  constructor(private readonly context: ExtensionContext, private panelViewProxy: PanelViewProxy) {
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
          default:
            console.warn('Unknown message:', message);
        }
      },
      undefined,
      this.context.subscriptions
    );

    void commands.executeCommand('setContext', 'viewPanel.exists', true);

    if (this.currentPanelViewInput) {
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
    void commands.executeCommand('setContext', 'viewPanel.recordingGif', true);
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.startRecordingPanelGif());
  }

  startRecordingPanelWebm(): void {
    void commands.executeCommand('setContext', 'viewPanel.recordingWebm', true);
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.startRecordingPanelWebm());
  }

  stopRecordingPanelGif(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.stopRecordingPanelGif());
    void commands.executeCommand('setContext', 'viewPanel.recordingGif', false);
  }

  stopRecordingPanelWebm(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(() => this.panelViewProxy.stopRecordingPanelWebm());
    void commands.executeCommand('setContext', 'viewPanel.recordingWebm', false);
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
    this.inputHistory = [];
    this.historyIndex = -1;
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
    const command = this.panelViewProxy.updatePanel(variables, this.currentVariables);
    this.currentVariables = variables;
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
    void commands.executeCommand('setContext', 'viewPanel.exists', false);
  }
}
