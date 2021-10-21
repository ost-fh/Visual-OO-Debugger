import { debug } from 'vscode';
import { DebuggerPanel } from '../webview/debuggerPanel';
import { DebugSessionProxy } from './debugSessionProxy';

export class DebugEventManager {
  constructor(debuggerPanel: DebuggerPanel) {
    debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: (session) => {
        const debugSessionProxy = new DebugSessionProxy(session);
        const onDidSendMessage = async (m: Message): Promise<void> => {
          if (m.type === 'event') {
            if (m.event === 'stopped') {
              const threadId = m.body.threadId;
              await debugSessionProxy.setActiveStackFrameId(threadId);
              await debuggerPanel.updatePanel(debugSessionProxy);
            }
          }
        };
        return { onDidSendMessage };
      },
    });
  }
}

interface Message {
  type: string;
  event?: string;
  body: { threadId: number };
}
