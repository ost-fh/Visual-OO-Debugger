import { commands, ExtensionContext, Memento, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { PanelViewInput } from '../model/panelViewInput';
import { NodeModulesAccessor } from '../node-modules-accessor/nodeModulesAccessor';
import { ObjectDiagramFileSaverFactory } from '../object-diagram/logic/export/objectDiagramFileSaverFactory';
import { PanelViewInputObjectDiagramReader } from '../object-diagram/logic/reader/panelViewInputObjectDiagramReader';
import { ObjectDiagram } from '../object-diagram/model/objectDiagram';
import { FileSaver } from '../object-diagram/utilities/export/fileSaver';
import { MementoAccessor } from '../object-diagram/utilities/storage/mementoAccessor';
import { PanelViewCommand, PanelViewProxy } from './panel-views/panelViewProxy';

export class DebuggerPanel {
  private viewPanel: WebviewPanel | undefined;

  private currentPanelViewInput: PanelViewInput | undefined;

  private readonly plantUmlObjectDiagramFileSaver: FileSaver;

  constructor(private readonly context: ExtensionContext, private panelViewProxy: PanelViewProxy) {
    const objectDiagramFileSaverFactory = this.createObjectDiagramFileSaverFactory(context.workspaceState);
    this.plantUmlObjectDiagramFileSaver = objectDiagramFileSaverFactory.createPlantUmlObjectDiagramFileSaver();
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
      (message) => {
        switch (message) {
          case 'creatingGif':
            void window.showInformationMessage('Creating GIF. This may take some time.');
            break;
          case 'stepBack':
            if (this.panelViewProxy.stepBack) {
              void this.viewPanel?.webview.postMessage(this.panelViewProxy.stepBack());
            }
            break;
          case 'stepForward':
            if (this.panelViewProxy.stepForward) {
              void this.viewPanel?.webview.postMessage(this.panelViewProxy.stepForward());
            }
            break;
          default:
            console.debug(message);
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
      this.postCommandToWebViewIfViewPanelIsDefined(this.panelViewProxy.updatePanel(panelViewInput));
    }
  }

  exportPanel(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(this.panelViewProxy.exportPanel());
  }

  startRecordingPanel(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(this.panelViewProxy.startRecordingPanel());
  }

  stopRecordingPanel(): void {
    this.postCommandToWebViewIfViewPanelIsDefined(this.panelViewProxy.stopRecordingPanel());
  }

  exportAsPlantUml(): Promise<void> {
    return this.plantUmlObjectDiagramFileSaver.saveFile();
  }

  private createObjectDiagramFileSaverFactory(memento: Memento): ObjectDiagramFileSaverFactory {
    return new ObjectDiagramFileSaverFactory(
      new MementoAccessor<string>(memento, 'visual-oo-debugger.lastObjectDiagramExportDirectoryPath'),
      (): ObjectDiagram => {
        const input = this.currentPanelViewInput;
        if (!input) {
          throw new Error('Could not export (no panel view input available)');
        }
        return new PanelViewInputObjectDiagramReader().read(input);
      }
    );
  }

  private postCommandToWebViewIfViewPanelIsDefined(command: PanelViewCommand): void {
    void this.viewPanel?.webview.postMessage(command);
  }

  setPanelViewProxy(panelViewProxy: PanelViewProxy): void {
    const viewPanelVisible = this.viewPanel?.visible;
    this.teardownPanel();
    this.panelViewProxy = panelViewProxy;
    if (viewPanelVisible) {
      this.openPanel();
    }
  }

  private teardownPanel(): void {
    if (this.viewPanel !== undefined) {
      this.viewPanel.dispose();
      this.viewPanel = undefined;
    }
    this.panelViewProxy.teardownPanelView();
    void commands.executeCommand('setContext', 'viewPanel.exists', false);
  }
}
