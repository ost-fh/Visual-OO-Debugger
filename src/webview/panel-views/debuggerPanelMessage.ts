import { WebviewMessage } from '../../model/webviewMessage';

interface StepBackDebuggerPanelMessage extends WebviewMessage {
  command: 'stepBack';
}

interface StepForwardDebuggerPanelMessage extends WebviewMessage {
  command: 'stepForward';
}

interface SelectStackFrameDebuggerPanelMessage extends WebviewMessage {
  command: 'selectStackFrame';
  content: number;
}

export type DebuggerPanelMessage = StepBackDebuggerPanelMessage | StepForwardDebuggerPanelMessage | SelectStackFrameDebuggerPanelMessage;
