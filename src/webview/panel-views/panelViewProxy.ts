import { DebugSessionProxy } from '../../debug-adapter/debugSessionProxy';

export interface PanelViewProxy {
  getHtml: () => string;
  updatePanel: (debugSessionProxy: DebugSessionProxy) => Promise<PanelViewCommand>;
  exportPanel: () => PanelViewCommand;
}

export interface PanelViewCommand {
  [key: string]: unknown;
  command: string;
}
