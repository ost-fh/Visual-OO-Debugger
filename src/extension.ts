import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  new Extension(context);
}

export function deactivate() { }

class Extension {
  private viewPanel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('visual-oo-debugger.openDebugger', () => this.setupPanel());

    context.subscriptions.push(disposable);
  }

  private setupPanel(): void {
    // Make sure only one panel exists
    if (this.viewPanel !== undefined) {
      this.viewPanel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.viewPanel = vscode.window.createWebviewPanel(
      'visualDebugger',
      'Visual Debugger',
      vscode.ViewColumn.Beside
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

