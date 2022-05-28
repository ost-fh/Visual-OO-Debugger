import { PanelViewProxy } from './panelViewProxy';
import { ExtensionContext, Webview } from 'vscode';
import { PanelViewColors, PanelViewInputVariableMap, PanelViewVariable } from '../../model/panelViewInput';
import { readFileSync } from 'fs';
import { isEqual } from 'lodash';
import {
  ExportImagePanelViewProxyMessage,
  InitializeRenderingAreaPanelViewProxyMessage,
  StartGifRecordingPanelViewProxyMessage,
  StartWebMRecordingPanelViewProxyMessage,
  StopGifRecordingPanelViewProxyMessage,
  StopWebMRecordingPanelViewProxyMessage,
  UpdateRenderingAreaPanelViewProxyMessage,
} from './panelViewProxyMessage';
import { NodeModulesKeys } from '../../node-modules-accessor/nodeModulesKeys';
import { NodeModulesAccessor } from '../../node-modules-accessor/nodeModulesAccessor';
import { PathHelper } from '../../util/pathHelper';

export abstract class AbstractPanelViewProxy<RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData> implements PanelViewProxy {
  private colorsOutdated = false;
  protected abstract readonly debuggerPanelPrefix: string;
  protected abstract readonly extraCssNodeModuleKeys: NodeModulesKeys[];

  protected static variableChanged(v1?: PanelViewVariable, v2?: PanelViewVariable): boolean {
    return Boolean(v1) && Boolean(v2) && !isEqual(v1, v2);
  }

  protected constructor(private readonly context: ExtensionContext) {}

  getHtml(webview: Webview): string {
    const debuggerFileNameStub = `${this.debuggerPanelPrefix}DebuggerPanel`;
    const pathHelper = new PathHelper(webview, this.context);
    return [
      ...[NodeModulesKeys.codiconCss, NodeModulesKeys.webviewUiToolkit, ...this.extraCssNodeModuleKeys].map((key) => ({
        tag: NodeModulesAccessor.getPathToNodeModulesFile(key).fileName,
        uri: pathHelper.getUri(...NodeModulesAccessor.getPathToOutputFile(key)),
      })),
      ...['css', 'js'].map((extension) => pathHelper.createMediaReplacement(extension, debuggerFileNameStub)),
      pathHelper.createMediaReplacement('css', 'debuggerPanel'),
    ].reduce(
      (html, { tag, uri }) => html.replace(`{{${tag}}}`, uri.toString()),
      readFileSync(pathHelper.getMediaUri('html', debuggerFileNameStub).fsPath, 'utf8')
    );
  }

  updatePanel(
    newVariables: PanelViewInputVariableMap,
    prevVariables: PanelViewInputVariableMap | undefined
  ):
    | InitializeRenderingAreaPanelViewProxyMessage<RenderingAreaData, RenderingAreaOptions>
    | UpdateRenderingAreaPanelViewProxyMessage<RenderingAreaUpdateData> {
    if (!prevVariables || this.colorsOutdated) {
      this.colorsOutdated = false;
      return {
        command: 'initializeRenderingArea',
        data: this.getRenderingAreaData(newVariables),
        options: this.getRenderingAreaOptions(),
      };
    }
    return {
      command: 'updateRenderingArea',
      data: this.getRenderingAreaUpdateData(newVariables, prevVariables),
    };
  }

  exportPanel(): ExportImagePanelViewProxyMessage {
    return {
      command: 'exportImage',
    };
  }

  startRecordingPanelGif(): StartGifRecordingPanelViewProxyMessage {
    return {
      command: 'startGifRecording',
    };
  }

  startRecordingPanelWebm(): StartWebMRecordingPanelViewProxyMessage {
    return {
      command: 'startWebMRecording',
    };
  }

  stopRecordingPanelGif(): StopGifRecordingPanelViewProxyMessage {
    return {
      command: 'stopGifRecording',
    };
  }

  stopRecordingPanelWebm(): StopWebMRecordingPanelViewProxyMessage {
    return {
      command: 'stopWebMRecording',
    };
  }

  setPanelStyles(viewColors: PanelViewColors): void {
    this.setColors(viewColors);
    this.colorsOutdated = true;
  }

  protected abstract setColors(viewColors: PanelViewColors): void;
  protected abstract getRenderingAreaData(variables: PanelViewInputVariableMap): RenderingAreaData;
  protected abstract getRenderingAreaOptions(): RenderingAreaOptions;
  protected abstract getRenderingAreaUpdateData(
    newVariables: PanelViewInputVariableMap,
    prevVariables: Map<string, PanelViewVariable>
  ): RenderingAreaUpdateData;
}
