import { commands, ExtensionContext } from 'vscode';
import { DebuggerPanel } from './webview/debugger-panel';
import { VisjsPanelView } from './webview/panel-views/visjs-panel-view';

export function activate(context: ExtensionContext) {
  new Extension(context);
}

export function deactivate() {}

class Extension {
  private debuggerPanel: DebuggerPanel;

  constructor(context: ExtensionContext) {
    this.debuggerPanel = new DebuggerPanel(context, new VisjsPanelView(context));

    context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => this.debuggerPanel.openPanel()));
  }
}
