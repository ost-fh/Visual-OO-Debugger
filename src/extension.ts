import { commands, ExtensionContext } from 'vscode';
import { DebuggerPanel } from './webview/debugger-panel';

export function activate(context: ExtensionContext) {
  new Extension(context);
}

export function deactivate() { }

class Extension {
  private debuggerPanel: DebuggerPanel;

  constructor(context: ExtensionContext) {
    this.debuggerPanel = new DebuggerPanel(context);

    context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => this.debuggerPanel.openPanel()));
  }
}
