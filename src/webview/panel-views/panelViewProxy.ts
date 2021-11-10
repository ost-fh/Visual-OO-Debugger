import { Webview } from 'vscode';
import { PanelViewInput } from '../../model/panelViewInput';

export interface PanelViewProxy {
  getHtml: (webview: Webview) => string;
  updatePanel: (panelViewInput: PanelViewInput) => PanelViewCommand;
  exportPanel: () => PanelViewCommand;
  startRecordingPanel: () => PanelViewCommand;
  stopRecordingPanel: () => PanelViewCommand;
  teardownPanelView: () => void;
  stepBack?: () => PanelViewCommand;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
