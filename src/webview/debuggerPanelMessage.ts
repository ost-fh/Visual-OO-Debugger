import { PanelViewCommand } from './panel-views/panelViewProxy';

interface DeselectStackFramesDebuggerPanelMessage extends PanelViewCommand {
  command: 'deselectStackFrames';
}

interface UpdateStackFramesDebuggerPanelMessage extends PanelViewCommand {
  command: 'updateStackFrames';
  stackFrames: string[];
}

export type DebuggerPanelMessage = DeselectStackFramesDebuggerPanelMessage | UpdateStackFramesDebuggerPanelMessage;
