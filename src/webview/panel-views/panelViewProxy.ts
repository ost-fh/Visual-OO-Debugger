import { DebugSessionProxy } from '../../debug-adapter/debugSessionProxy';

export interface PanelViewProxy {
  getHtml: () => string;
  updatePanel: (debugSessionProxy: DebugSessionProxy) => Promise<UpdatePanelViewCommand>;
}

export interface UpdatePanelViewCommand {
  [key: string]: unknown;
  command: string;
}
