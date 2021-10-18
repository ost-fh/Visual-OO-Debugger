import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';
import { PanelViewProxy } from './panel-views/panel-view-proxy';

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

    this.viewPanel.webview.postMessage(this.panelViewProxy.updatePanel());
  }

  private teardownPanel(): void {
    this.viewPanel = undefined;
  }
}
