import { commands, ExtensionContext } from 'vscode';
import { DebuggerPanel } from './webview/debugger-panel';
import { VisjsPanelView } from './webview/panel-views/visjs-panel-view';
import { DebugPrinter } from './debug-adapter/DebugPrinter';
import { DebugEventManager } from './debug-adapter/DebugEventManager';

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

    const dp = new DebugPrinter 
    const dsm = new DebugEventManager(dp);

    context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => this.debuggerPanel.openPanel()));


  }
}
