import { ExtensionContext, ViewColumn, WebviewPanel, window, commands } from 'vscode';
import { DebugSessionProxy } from '../debug-adapter/debugSessionProxy';
import { PanelViewProxy } from './panel-views/panelViewProxy';

export class DebuggerPanel {
  private viewPanel: WebviewPanel | undefined;

  constructor(private readonly context: ExtensionContext, private panelViewProxy: PanelViewProxy) {}

  openPanel(): void {
    // Make sure only one panel exists
    if (this.viewPanel !== undefined) {
      this.viewPanel.reveal(ViewColumn.Beside);
      return;
    }

    this.viewPanel = window.createWebviewPanel('visualDebugger', 'Visual Debugger', ViewColumn.Beside, {
      enableScripts: true,
    });

    this.viewPanel.onDidDispose(() => this.teardownPanel(), null, this.context.subscriptions);

    this.viewPanel.webview.html = this.panelViewProxy.getHtml();

    void commands.executeCommand('setContext', 'viewPanel.exists', true);
  }

  async updatePanel(debugSessionProxy: DebugSessionProxy): Promise<void> {
    if (this.viewPanel !== undefined && debugSessionProxy !== undefined) {
      void this.viewPanel.webview.postMessage(await this.panelViewProxy.updatePanel(debugSessionProxy));
    }
  }

  exportPanel(): void {
    if (this.viewPanel !== undefined) {
      void this.viewPanel.webview.postMessage(this.panelViewProxy.exportPanel());
    }
  }

  private teardownPanel(): void {
    this.viewPanel = undefined;
    void commands.executeCommand('setContext', 'viewPanel.exists', false);
  }
}
