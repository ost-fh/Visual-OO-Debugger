import { Webview } from 'vscode';
import { PanelViewInputVariableMap } from '../../model/panelViewInput';

export interface PanelViewProxy {
  getHtml: (webview: Webview) => string;
  updatePanel: (variables: PanelViewInputVariableMap) => PanelViewCommand;
  exportPanel: () => PanelViewCommand;
  startRecordingPanel: () => PanelViewCommand;
  stopRecordingPanel: () => PanelViewCommand;
  teardownPanelView: () => void;
  stepBack?: () => PanelViewCommand;
  stepForward?: () => PanelViewCommand;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
