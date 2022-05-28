import { WebviewApi } from 'vscode-webview';
import { DebuggerPanelMessage } from './debuggerPanelMessage';

export class DebuggerPanelMessageService {
  constructor(private readonly webviewApi: WebviewApi<unknown>) {}

  stepBack(): void {
    this.postMessage({
      command: 'stepBack',
    });
  }

  stepForward(): void {
    this.postMessage({
      command: 'stepForward',
    });
  }

  selectStackFrame(index: number): void {
    this.postMessage({
      command: 'selectStackFrame',
      content: index,
    });
  }

  private postMessage(message: DebuggerPanelMessage): void {
    this.webviewApi.postMessage(message);
  }
}
