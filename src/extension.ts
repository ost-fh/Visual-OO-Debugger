import { commands, ExtensionContext } from 'vscode';
import { DebugEventManager } from './debug-adapter/debugEventManager';
import { DebuggerPanel } from './webview/debuggerPanel';
import { VisjsPanelView } from './webview/panel-views/visjsPanelView';

export function activate(context: ExtensionContext): void {
  new Extension(context);
}

export function deactivate(): void {
  //  Do nothing
}

class Extension {
  private debuggerPanel: DebuggerPanel;

  constructor(context: ExtensionContext) {
    const visjsPanelView = new VisjsPanelView(context);
    this.debuggerPanel = new DebuggerPanel(context, visjsPanelView);
    new DebugEventManager(this.debuggerPanel);

    context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => this.debuggerPanel.openPanel()));
  }
}
