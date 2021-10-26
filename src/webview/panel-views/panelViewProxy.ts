import { PanelViewInput } from '../../model/panelViewInput';

export interface PanelViewProxy {
  getHtml: () => string;
  updatePanel: (panelViewInput: PanelViewInput) => PanelViewCommand;
  exportPanel: () => PanelViewCommand;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
