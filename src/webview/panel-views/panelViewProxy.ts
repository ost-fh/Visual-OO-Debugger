import { Webview } from 'vscode';
import { PanelViewInputVariableMap } from '../../model/panelViewInput';

export interface PanelViewProxy {
  getHtml: (webview: Webview) => string;
  updatePanel: (newVariables: PanelViewInputVariableMap, prevVariables?: PanelViewInputVariableMap) => PanelViewCommand;
  exportPanel: () => PanelViewCommand;
  startRecordingPanel: () => PanelViewCommand;
  stopRecordingPanel: () => PanelViewCommand;
  teardownPanelView?: () => void;
  setPanelStyles: (colorMap: Map<string, string>) => void;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
