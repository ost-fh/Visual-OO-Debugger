import { ExtensionContext, ViewColumn, WebviewPanel, window, commands, Uri } from 'vscode';
import { PanelViewInput } from '../model/panelViewInput';
import { PanelViewProxy } from './panel-views/panelViewProxy';

export class DebuggerPanel {
  private viewPanel: WebviewPanel | undefined;

  private currentPanelViewInput: PanelViewInput | undefined;

  constructor(private readonly context: ExtensionContext, private panelViewProxy: PanelViewProxy) {}

  openPanel(): void {
    // Make sure only one panel exists
    if (this.viewPanel !== undefined) {
      this.viewPanel.reveal(ViewColumn.Beside);
      return;
    }

    this.viewPanel = window.createWebviewPanel('visualDebugger', 'Visual Debugger', ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [Uri.joinPath(this.context.extensionUri, 'node_modules'), Uri.joinPath(this.context.extensionUri, 'media')],
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
    if (this.viewPanel !== undefined && panelViewInput !== undefined) {
      void this.viewPanel.webview.postMessage(this.panelViewProxy.updatePanel(panelViewInput));
    }
  }

  exportPanel(): void {
    if (this.viewPanel !== undefined) {
      void this.viewPanel.webview.postMessage(this.panelViewProxy.exportPanel());
    }
  }

  startRecordingPanel(): void {
    if (this.viewPanel !== undefined) {
      void this.viewPanel.webview.postMessage(this.panelViewProxy.startRecordingPanel());
    }
  }

  stopRecordingPanel(): void {
    if (this.viewPanel !== undefined) {
      void this.viewPanel.webview.postMessage(this.panelViewProxy.stopRecordingPanel());
    }
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
