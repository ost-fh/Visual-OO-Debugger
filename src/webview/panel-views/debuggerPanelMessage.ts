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

interface OpenAllClustersDebuggerPanelMessage extends WebviewMessage {
  command: 'openAllClusters';
}

interface OpenClusterDebuggerPanelMessage extends WebviewMessage {
  command: 'openCluster';
  content: string;
}

interface CreateClusterDebuggerPanelMessage extends WebviewMessage {
  command: 'createCluster';
  content: string;
}

export type DebuggerPanelMessage =
  | StepBackDebuggerPanelMessage
  | StepForwardDebuggerPanelMessage
  | SelectStackFrameDebuggerPanelMessage
  | OpenAllClustersDebuggerPanelMessage
  | OpenClusterDebuggerPanelMessage
  | CreateClusterDebuggerPanelMessage;
