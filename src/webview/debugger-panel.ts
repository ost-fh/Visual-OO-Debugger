import { readFileSync } from 'fs';
import { join } from 'path';
import { ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from 'vscode';

export class DebuggerPanel {
  private viewPanel: WebviewPanel | undefined;

  constructor(private readonly context: ExtensionContext) {
  }

  openPanel(): void {
    // Make sure only one panel exists
    if (this.viewPanel !== undefined) {
      this.viewPanel.reveal(ViewColumn.Beside);
      return;
    }

    this.viewPanel = window.createWebviewPanel(
      'visualDebugger',
      'Visual Debugger',
      ViewColumn.Beside
    );

    this.viewPanel.onDidDispose(() => this.teardownPanel(), null, this.context.subscriptions);

    const filePath = Uri.file(join(this.context.extensionPath, 'src', 'webview', 'html', 'debugger-panel.html'));
    this.viewPanel.webview.html = readFileSync(filePath.fsPath, 'utf8');
  }

  private teardownPanel(): void {
    this.viewPanel = undefined;
  }
}
