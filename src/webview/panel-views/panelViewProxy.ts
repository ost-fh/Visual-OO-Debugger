import { Webview } from 'vscode';
import { PanelViewInputVariableMap } from '../../model/panelViewInput';

export interface PanelViewProxy {
  getHtml: (webview: Webview) => string;
  updatePanel: (newVariables: PanelViewInputVariableMap, prevVariables?: PanelViewInputVariableMap) => PanelViewCommand;
  exportPanel: () => PanelViewCommand;
  startRecordingPanelGif: () => PanelViewCommand;
  startRecordingPanelWebm: () => PanelViewCommand;
  stopRecordingPanelGif: () => PanelViewCommand;
  stopRecordingPanelWebm: () => PanelViewCommand;
  teardownPanelView?: () => void;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
