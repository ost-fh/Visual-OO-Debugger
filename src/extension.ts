import { commands, ExtensionContext, workspace } from 'vscode';
import { DebugEventManager } from './debug-adapter/debugEventManager';
import { DebuggerPanel } from './webview/debuggerPanel';
import { PanelViewProxy } from './webview/panel-views/panelViewProxy';
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
    const debuggerPanel = new DebuggerPanel(this.context, this.getPanelViewByConfiguration());
    const debugEventManager = new DebugEventManager();
    debugEventManager.registerDebuggerPanel(debuggerPanel);

    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.openDebugger', () => debuggerPanel.openPanel()));
    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.exportPNG', () => debuggerPanel.exportPanel()));
    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.startGIF', () => debuggerPanel.startRecordingPanel()));
    this.context.subscriptions.push(commands.registerCommand('visual-oo-debugger.stopGIF', () => debuggerPanel.stopRecordingPanel()));

    workspace.onDidChangeConfiguration(() => debuggerPanel.setPanelViewProxy(this.getPanelViewByConfiguration()));
  }

  getPanelViewByConfiguration(): PanelViewProxy {
    const preferredView = workspace.getConfiguration('visual-oo-debugger');
    switch (preferredView.get('preferredView')) {
      case 'vis.js':
        return new VisjsPanelView(this.context);
      default:
        return new VisjsPanelView(this.context);
    }
  }
}
