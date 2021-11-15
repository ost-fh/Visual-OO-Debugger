import { readFileSync } from 'fs';
import { ExtensionContext, Uri, Webview } from 'vscode';
import { PanelViewInput } from '../../model/panelViewInput';
import { PanelViewCommand, PanelViewProxy } from './panelViewProxy';

export class JointjsPanelView implements PanelViewProxy {
  private currentPanelViewInput: PanelViewInput | undefined;

  constructor(private readonly context: ExtensionContext) {}

  getHtml(webview: Webview): string {
    const jointCssUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'node_modules', 'jointjs', 'dist', 'joint.min.css'));
    const cssUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'media', 'css', 'jointjsDebuggerPanel.css'));
    const jqueryUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'node_modules', 'jquery', 'dist', 'jquery.min.js'));
    const lodashUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'node_modules', 'lodash', 'lodash.min.js'));
    const backboneUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'node_modules', 'backbone', 'backbone-min.js'));
    const jointJsUri = webview.asWebviewUri(Uri.joinPath(this.context.extensionUri, 'node_modules', 'jointjs', 'dist', 'joint.min.js'));
    const filePath = Uri.joinPath(this.context.extensionUri, 'media', 'html', 'jointjsDebuggerPanel.html');
    return readFileSync(filePath.fsPath, 'utf8')
      .replace('{{joint.css}}', jointCssUri.toString())
      .replace('{{jointjsDebuggerPanel.css}}', cssUri.toString())
      .replace('{{jquery.js}}', jqueryUri.toString())
      .replace('{{lodash.js}}', lodashUri.toString())
      .replace('{{backbone.js}}', backboneUri.toString())
      .replace('{{joint.js}}', jointJsUri.toString());
  }

  teardownPanelView(): void {
    this.currentPanelViewInput = undefined;
  }

  updatePanel(panelViewInput: PanelViewInput): PanelViewCommand {
    this.currentPanelViewInput = panelViewInput;
    return { command: 'updateJointjs', data: undefined };
  }

  exportPanel(): PanelViewCommand {
    return { command: 'exportJointjs' };
  }

  startRecordingPanel(): PanelViewCommand {
    return { command: 'startRecordingJointjs' };
  }

  stopRecordingPanel(): PanelViewCommand {
    return { command: 'stopRecordingJointjs' };
  }

  stepForward(): PanelViewCommand {
    return { command: 'updateJointjs', data: undefined };
  }

  stepBack(): PanelViewCommand {
    return { command: 'updateJointjs', data: undefined };
  }
}
