import { Webview } from 'vscode';
import { PanelViewColors, PanelViewInputVariableMap } from '../../model/panelViewInput';

export interface PanelViewProxy {
  getHtml: (webview: Webview) => string;
  updatePanel: (newVariables: PanelViewInputVariableMap, prevVariables?: PanelViewInputVariableMap) => PanelViewCommand;
  exportPanel: () => PanelViewCommand;
  canRecordGif(): boolean;
  canRecordWebm(): boolean;
  startRecordingPanelGif: () => PanelViewCommand;
  startRecordingPanelWebm: () => PanelViewCommand;
  stopRecordingPanelGif: () => PanelViewCommand;
  stopRecordingPanelWebm: () => PanelViewCommand;
  teardownPanelView?: () => void;
  setPanelStyles: (viewColors: PanelViewColors) => void;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
