import { ExtensionContext, ViewColumn, WebviewPanel, window, commands } from 'vscode';
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
    });

    this.viewPanel.onDidDispose(() => this.teardownPanel(), null, this.context.subscriptions);

    this.viewPanel.webview.html = this.panelViewProxy.getHtml();

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

  private teardownPanel(): void {
    this.viewPanel = undefined;
    this.panelViewProxy.teardownPanelView();
    void commands.executeCommand('setContext', 'viewPanel.exists', false);
  }
}
