import { debug, DebugSession } from 'vscode';
import { DebugPrinter } from './DebugPrinter';
import { DebugSessionProxy } from './DebugSessionProxy';

export class DebugEventManager {
  constructor(print:DebugPrinter) {
    debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: session => {
        const debugSessionproxy = new DebugSessionProxy(session);
        return {
          onDidSendMessage: async m => {
            if (m.type === 'event') {
              if (m.event === 'stopped') {
                const threadId = m.body.threadId;
                await debugSessionproxy.setActiveStackFrameId(threadId);
                print.printSession(debugSessionproxy);
              }
            }
          }
        };
      }
    });
  }
}