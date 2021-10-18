import { commands, ExtensionContext } from 'vscode';
import { DebuggerPanel } from './webview/debugger-panel';
import { VisjsPanelView } from './webview/panel-views/visjs-panel-view';

export function activate(context: ExtensionContext): void {
  new Extension(context);
}

export function deactivate(): void {
  //  Do nothing
}

class Extension {
  private debuggerPanel: DebuggerPanel;

  constructor(context: ExtensionContext) {
    this.debuggerPanel = new DebuggerPanel(context, new VisjsPanelView(context));

    context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => this.debuggerPanel.openPanel()));
  }
}
