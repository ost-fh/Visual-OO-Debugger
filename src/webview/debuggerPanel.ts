import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';
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
  }

  async updatePanel(debugSessionProxy: DebugSessionProxy): Promise<void> {
    if (this.viewPanel !== undefined && debugSessionProxy !== undefined) {
      void this.viewPanel.webview.postMessage(await this.panelViewProxy.updatePanel(debugSessionProxy));
    }
  }

  private teardownPanel(): void {
    this.viewPanel = undefined;
  }
}
