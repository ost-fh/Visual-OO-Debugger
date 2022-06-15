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

  openAllClusters(): void {
    this.postMessage({
      command: 'openAllClusters',
    });
  }

  openCluster(clusterId: string): void {
    this.postMessage({
      command: 'openCluster',
      content: clusterId,
    });
  }

  createCluster(nodeId: string): void {
    this.postMessage({
      command: 'createCluster',
      content: nodeId,
    });
  }

  hideNode(nodeId: string): void {
    this.postMessage({
      command: 'hideNode',
      content: nodeId,
    });
  }

  showAllNodes(): void {
    this.postMessage({
      command: 'showAllNodes',
    });
  }

  private postMessage(message: DebuggerPanelMessage): void {
    this.webviewApi.postMessage(message);
  }
}
