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
    debuggerPanel.setPanelStyles(this.getPanelStylesByConfiguration());
    const debugEventManager = new DebugEventManager();
    debugEventManager.registerDebuggerPanel(debuggerPanel);

    this.registerCommand('visual-oo-debugger.openDebugger', () => debuggerPanel.openPanel());
    this.registerCommand('visual-oo-debugger.exportPNG', () => debuggerPanel.exportPanel());
    this.registerCommand('visual-oo-debugger.startGIF', () => debuggerPanel.startRecordingPanel());
    this.registerCommand('visual-oo-debugger.stopGIF', () => debuggerPanel.stopRecordingPanel());
    this.registerCommand('visual-oo-debugger.exportAsPlantUml', () => debuggerPanel.exportAsPlantUml());
    this.registerCommand('visual-oo-debugger.exportAsGraphViz', () => debuggerPanel.exportAsGraphViz());

    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('visual-oo-debugger.preferredView')) {
        debuggerPanel.setPanelViewProxy(this.getPanelViewByConfiguration());
      } else if (
        e.affectsConfiguration('visual-oo-debugger.defaultColor') ||
        e.affectsConfiguration('visual-oo-debugger.variableColor') ||
        e.affectsConfiguration('visual-oo-debugger.changedColor') ||
        e.affectsConfiguration('visual-oo-debugger.changedVariableColor')
      ) {
        debuggerPanel.setPanelStyles(this.getPanelStylesByConfiguration());
      }
    });
  }

  private registerCommand(command: string, callback: (...args: unknown[]) => unknown, thisArg?: unknown): void {
    this.context.subscriptions.push(commands.registerCommand(command, callback, thisArg));
  }

  getPanelViewByConfiguration(): PanelViewProxy {
    const configuration = workspace.getConfiguration('visual-oo-debugger');
    switch (configuration.get('preferredView')) {
      case 'vis.js':
        return new VisjsPanelView(this.context);
      default:
        return new VisjsPanelView(this.context);
    }
  }
  getPanelStylesByConfiguration(): Map<string, string[]> {
    const configuration = workspace.getConfiguration('visual-oo-debugger');
    const baseColorMap = new Map<string, string[]>();

    baseColorMap.set('defaultColor', [
      configuration.get('defaultColor') as string,
      configuration.inspect('defaultColor')?.defaultValue as string,
    ]);
    baseColorMap.set('variableColor', [
      configuration.get('variableColor') as string,
      configuration.inspect('variableColor')?.defaultValue as string,
    ]);
    baseColorMap.set('changedColor', [
      configuration.get('changedColor') as string,
      configuration.inspect('changedColor')?.defaultValue as string,
    ]);
    baseColorMap.set('changedVariableColor', [
      configuration.get('changedVariableColor') as string,
      configuration.inspect('changedVariableColor')?.defaultValue as string,
    ]);

    return baseColorMap;
  }
}
