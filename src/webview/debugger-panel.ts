import { ExtensionContext, ViewColumn, WebviewPanel, window } from "vscode";

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

    this.viewPanel.webview.html = this.getWebviewContent();
  }

  private teardownPanel(): void {
    this.viewPanel = undefined;
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
	  <html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Visual Debugger</title>
		</head>
		<body>
			<p>Visual Debugger works!</p>
		</body>
	  </html>`;
  }
}