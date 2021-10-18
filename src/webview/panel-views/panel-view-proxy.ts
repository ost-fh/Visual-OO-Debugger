export interface PanelViewProxy {
  getHtml: () => string;
  updatePanel: () => UpdatePanelViewCommand;
}

export interface UpdatePanelViewCommand {
  [key: string]: unknown;
  command: string;
}
