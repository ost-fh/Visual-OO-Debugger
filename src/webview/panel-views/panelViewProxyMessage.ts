import { PanelViewCommand } from './panelViewProxy';

export interface InitializeRenderingAreaPanelViewProxyMessage<Data, Options> extends PanelViewCommand {
  command: 'initializeRenderingArea';
  data: Data;
  options: Options;
}

export interface UpdateRenderingAreaPanelViewProxyMessage<Data> extends PanelViewCommand {
  command: 'updateRenderingArea';
  data: Data;
}

export interface ExportImagePanelViewProxyMessage extends PanelViewCommand {
  command: 'exportImage';
}

export interface StartWebMRecordingPanelViewProxyMessage extends PanelViewCommand {
  command: 'startWebMRecording';
}

export interface StopWebMRecordingPanelViewProxyMessage extends PanelViewCommand {
  command: 'stopWebMRecording';
}

export interface StartGifRecordingPanelViewProxyMessage extends PanelViewCommand {
  command: 'startGifRecording';
}

export interface StopGifRecordingPanelViewProxyMessage extends PanelViewCommand {
  command: 'stopGifRecording';
}

export type PanelViewProxyMessage<InitializationData, InitializationOptions, UpdateData> =
  | InitializeRenderingAreaPanelViewProxyMessage<InitializationData, InitializationOptions>
  | UpdateRenderingAreaPanelViewProxyMessage<UpdateData>
  | ExportImagePanelViewProxyMessage
  | StartWebMRecordingPanelViewProxyMessage
  | StopWebMRecordingPanelViewProxyMessage
  | StartGifRecordingPanelViewProxyMessage
  | StopGifRecordingPanelViewProxyMessage;
