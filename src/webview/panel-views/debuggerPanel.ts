import { DebuggerPanelMessageService } from './debuggerPanelMessageService';
import { Button, Dropdown, Option } from '@vscode/webview-ui-toolkit';
import { PanelViewProxyMessage } from './panelViewProxyMessage';
import { DebuggerPanelMessage } from '../debuggerPanelMessage';

type ClickHandler = () => void;

const renderingAreaClassName = 'rendering-area';

type WebMRecordingContext = Pick<MediaRecorder, 'stop'>;

interface GifRecordingContext {
  //  TODO: VOOD-171: Replace with proper GIF recording context contents
  dummy: undefined;
}

interface RecordingContextsByFormat {
  gif: GifRecordingContext;
  webm: WebMRecordingContext;
}

type RecordingFormat = 'gif' | 'webm';

type RecordingContext<Format extends RecordingFormat> = RecordingContextsByFormat[Format];

const webMMimeType = 'video/webm; codecs=vp9';

export abstract class DebuggerPanel<RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData> {
  private readonly renderingArea = this.createRenderingArea();
  private readonly emptyOption = this.createOption({
    textContent: '',
    value: '',
    disabled: true,
    hidden: true,
  });
  private readonly toolBarButtons: Button[] = [];
  private readonly stackFramesDropdown = this.createStackFramesDropdown();
  private canvas: HTMLCanvasElement | null = null;
  private readonly recordingContextsByFormat: Partial<RecordingContextsByFormat> = {};
  private readonly recordingIndicator = this.createRecordingIndicator();

  protected constructor(
    protected readonly window: Window,
    protected readonly document: Document,
    protected readonly messageService: DebuggerPanelMessageService
  ) {
    document.body.appendChild(this.createContainer());
    this.initializeMessageHandling();
  }

  //  DOM interaction :: Tool bar

  private updateStackFrames(stackFrameNames: string[]): void {
    const dropdown = this.stackFramesDropdown;
    dropdown.innerHTML = '';
    stackFrameNames.forEach((textContent, index) =>
      dropdown.appendChild(
        this.createOption({
          textContent,
          value: String(index),
        })
      )
    );
    dropdown.appendChild(this.emptyOption);
  }

  private deselectStackFrames(): void {
    this.stackFramesDropdown.value = '';
  }

  //  DOM interaction :: Rendering area

  protected abstract initializeRenderingArea(renderingArea: HTMLDivElement, data: RenderingAreaData, options: RenderingAreaOptions): void;

  protected abstract updateRenderingArea(data: RenderingAreaUpdateData): void;

  private exportImage(): void {
    const { canvas } = this;
    if (canvas) {
      this.downloadFile('export.png', canvas.toDataURL('image/png'));
    } else {
      console.warn('Cannot export image without canvas');
    }
  }

  private startWebMRecording(): void {
    this.startRecording<'webm'>('webm', (canvas) => {
      const recorder = new MediaRecorder(canvas.captureStream(), {
        mimeType: webMMimeType,
      });
      const streamBlobs: Blob[] = [];
      let snapshotBlob: Blob | null = null;
      canvas.toBlob((blob) => {
        snapshotBlob = blob;
      }, webMMimeType);
      recorder.addEventListener('dataavailable', ({ data }): void => {
        if (data.size > 0) {
          streamBlobs.push(data);
        }
      });
      recorder.addEventListener('stop', () => {
        const blob =
          streamBlobs.length > 0
            ? new Blob(streamBlobs, {
                type: webMMimeType,
              })
            : snapshotBlob;
        if (blob) {
          this.downloadBlobFile('export.webm', blob);
        } else {
          console.warn('No blob could be retrieved during WebM recording');
        }
      });
      recorder.addEventListener('error', ({ error }) => {
        console.warn('WebM stream capture error:', error);
      });
      recorder.start();
      return recorder;
    });
  }

  private stopWebMRecording(): void {
    this.stopRecording<'webm'>('webm', (recorder) => recorder.stop());
  }

  private startGifRecording(): void {
    this.startRecording<'gif'>('gif', () => {
      //  TODO: VOOD-171: Initialize GIF recording context
      //  TODO: VOOD-171: Start GIF recording
      return {
        dummy: undefined,
      };
    });
  }

  private stopGifRecording(): void {
    this.stopRecording<'gif'>('gif', (handler) => {
      //  TODO: VOOD-171: Stop GIF recording
      console.warn('DebuggerPanel.stopGifRecording', 'handler', handler);
    });
  }

  private startRecording<Format extends RecordingFormat>(
    format: RecordingFormat,
    contextFactory: (canvas: HTMLCanvasElement) => RecordingContext<Format>
  ): void {
    if (this.recordingContextsByFormat[format]) {
      console.warn(`${format} recording already in progress`);
    } else {
      const { canvas } = this;
      if (canvas) {
        (this.recordingContextsByFormat[format] as RecordingContext<Format>) = contextFactory(canvas);
      } else {
        console.warn(`Cannot start ${format} recording without canvas`);
      }
    }
    this.updateRecordingIndicatorVisibility();
  }

  private stopRecording<Format extends RecordingFormat>(
    format: RecordingFormat,
    contextHandler: (context: RecordingContext<Format>) => void
  ): void {
    const context = this.recordingContextsByFormat[format] as RecordingContext<Format>;
    if (context) {
      contextHandler(context);
      delete this.recordingContextsByFormat[format];
    } else {
      console.warn(`No ${format} recording in progress`);
    }
    this.updateRecordingIndicatorVisibility();
  }

  private updateRecordingIndicatorVisibility(): void {
    this.recordingIndicator.style.visibility = Object.keys(this.recordingContextsByFormat).length > 0 ? 'visible' : 'hidden';
  }

  private resetCanvas(): void {
    this.canvas = this.document.querySelector(`.${renderingAreaClassName} canvas`);
  }

  private enableToolBarControls(): void {
    this.toolBarControls.forEach((control) => (control.disabled = false));
  }

  private get toolBarControls(): (Button | Dropdown)[] {
    return [...this.toolBarButtons, this.stackFramesDropdown];
  }

  private downloadBlobFile(fileName: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    this.downloadFile(fileName, url);
    URL.revokeObjectURL(url);
  }

  private downloadFile(fileName: string, url: string): void {
    const link = this.document.createElement('a');
    link.download = fileName;
    link.href = url;
    link.click();
  }

  protected abstract openAllClusters(): void;

  //  Window event handling

  private initializeMessageHandling(): void {
    this.window.addEventListener(
      'message',
      ({ data }: MessageEvent<PanelViewProxyMessage<RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData>>) =>
        this.onPanelViewProxyMessageReceived(data)
    );
  }

  private onPanelViewProxyMessageReceived(
    message: DebuggerPanelMessage | PanelViewProxyMessage<RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData>
  ): void {
    switch (message.command) {
      case 'deselectStackFrames':
        this.deselectStackFrames();
        break;
      case 'updateStackFrames':
        this.updateStackFrames(message.stackFrames);
        break;
      case 'initializeRenderingArea':
        this.initializeRenderingArea(this.renderingArea, message.data, message.options);
        this.resetCanvas();
        this.enableToolBarControls();
        break;
      case 'updateRenderingArea':
        this.updateRenderingArea(message.data);
        break;
      case 'exportImage':
        this.exportImage();
        break;
      case 'startWebMRecording':
        this.startWebMRecording();
        break;
      case 'stopWebMRecording':
        this.stopWebMRecording();
        break;
      case 'startGifRecording':
        this.startGifRecording();
        break;
      case 'stopGifRecording':
        this.stopGifRecording();
        break;
      default:
        console.warn('Unknown message:', message);
    }
  }

  //  DOM creation and event handling

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'container';
    container.appendChild(this.renderingArea);
    container.appendChild(this.createToolBar());
    container.appendChild(this.createStatusBar());
    return container;
  }

  private createToolBar(): HTMLDivElement {
    this.toolBarButtons.length = 0;
    const toolBar = this.document.createElement('div');
    toolBar.className = 'tool-bar';
    toolBar.appendChild(this.createStepBackButton());
    toolBar.appendChild(this.createStepForwardButton());
    toolBar.appendChild(this.stackFramesDropdown);
    toolBar.appendChild(this.createOpenAllClustersButton());
    return toolBar;
  }

  private createStepBackButton(): Button {
    return this.createStepButton('Show previous step', 'debug-reverse-continue', () => this.messageService.stepBack());
  }

  private createStepForwardButton(): Button {
    return this.createStepButton('Show next step', 'debug-continue', () => this.messageService.stepForward());
  }

  private createStepButton(ariaLabel: string, codiconKey: string, clickHandler: ClickHandler): Button {
    return this.createToolBarButton('progress-button', ariaLabel, codiconKey, clickHandler);
  }

  private createOpenAllClustersButton(): Button {
    return this.createToolBarButton('open-all-clusters-button', 'Open all clusters', 'type-hierarchy', () => this.openAllClusters());
  }

  private createToolBarButton(className: string, ariaLabel: string, codiconKey: string, clickHandler: ClickHandler): Button {
    const button = this.document.createElement('vscode-button') as Button;
    button.className = className;
    button.appearance = 'icon';
    button.ariaLabel = ariaLabel;
    button.disabled = true;
    button.appendChild(this.createCodicon(codiconKey));
    button.addEventListener('click', clickHandler);
    this.toolBarButtons.push(button);
    return button;
  }

  private createStackFramesDropdown(): Dropdown {
    const dropdown = this.document.createElement('vscode-dropdown') as Dropdown;
    dropdown.className = 'stack-frames-dropdown';
    dropdown.disabled = true;
    dropdown.addEventListener('change', ({ target }) => {
      const { value } = target as Option;
      this.messageService.selectStackFrame(value ? Number(value) : -1);
    });
    return dropdown;
  }

  private createOption(properties: Pick<Option, 'textContent' | 'value'> & Partial<Pick<Option, 'disabled' | 'hidden'>>): Option {
    return Object.assign(this.document.createElement('vscode-option') as Option, properties);
  }

  private createRenderingArea(): HTMLDivElement {
    const renderingArea = this.document.createElement('div');
    renderingArea.className = renderingAreaClassName;
    return renderingArea;
  }

  private createStatusBar(): HTMLDivElement {
    const statusBar = this.document.createElement('div');
    statusBar.className = 'status-bar';
    statusBar.appendChild(this.recordingIndicator);
    return statusBar;
  }

  private createRecordingIndicator(): HTMLSpanElement {
    return this.createCodicon('record', 'recording-indicator');
  }

  private createCodicon(codiconKey: string, ...extraClasses: string[]): HTMLSpanElement {
    const codicon = this.document.createElement('span');
    codicon.classList.add('codicon', `codicon-${codiconKey}`, ...extraClasses);
    return codicon;
  }
}

export const registerDebuggerPanelFactory = <RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData>(
  debuggerPanelFactory: (
    window: Window,
    document: Document,
    messageService: DebuggerPanelMessageService
  ) => DebuggerPanel<RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData>
): void =>
  window.addEventListener('load', () => debuggerPanelFactory(window, document, new DebuggerPanelMessageService(acquireVsCodeApi())));
