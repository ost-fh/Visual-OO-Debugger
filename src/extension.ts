import { commands, ExtensionContext } from 'vscode';
import { DebugEventManager } from './debug-adapter/debugEventManager';
import { DebuggerPanel } from './webview/debuggerPanel';
import { VisjsPanelView } from './webview/panel-views/visjsPanelView';

export function activate(context: ExtensionContext): void {
  const extension = new Extension(context);
  extension.registerCommands();
}

export function deactivate(): void {
  //  Do nothing
}

class Extension {
  constructor(private readonly context: ExtensionContext) {}

  registerCommands(): void {
    const visjsPanelView = new VisjsPanelView(this.context);
    const debuggerPanel = new DebuggerPanel(this.context, visjsPanelView);
    const debugEventManager = new DebugEventManager();
    debugEventManager.registerDebuggerPanel(debuggerPanel);

    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => debuggerPanel.openPanel()));
    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.exportPNG', () => debuggerPanel.exportPanel()));
    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.startGIF', () => debuggerPanel.startRecordingPanel()));
    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.stopGIF', () => debuggerPanel.stopRecordingPanel()));
  }
}
