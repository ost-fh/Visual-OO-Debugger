import { Button, Dropdown, Option } from '@vscode/webview-ui-toolkit';
import { DebuggerPanelMessage } from '../debuggerPanelMessage';
import { PanelViewProxyMessage } from './panelViewProxyMessage';
import { DebuggerPanelMessageService } from './debuggerPanelMessageService';

type ClickHandler = () => void;

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
  private readonly recordingIndicator = this.createRecordingIndicator();

  protected constructor(
    protected readonly window: Window,
    protected readonly document: Document,
    protected readonly messageService: DebuggerPanelMessageService
  ) {
    document.body.appendChild(this.createContainer());
    this.initializeMessageHandling();
  }

  //  Initialization :: UI

  private createContainer(): HTMLDivElement {
    return this.createDiv('container', this.renderingArea, this.createToolBar(), this.createStatusBar());
  }

  //  Initialization :: UI :: Rendering area

  private createRenderingArea(): HTMLDivElement {
    return this.createDiv('rendering-area');
  }

  //  Initialization :: UI :: Tool bar

  protected createToolBar(): HTMLDivElement {
    this.toolBarButtons.length = 0;
    return this.createDiv('tool-bar', this.createStepBackButton(), this.createStepForwardButton(), this.stackFramesDropdown);
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

  protected createToolBarButton(className: string, ariaLabel: string, codiconKey: string, clickHandler: ClickHandler): Button {
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

  //  Initialization :: UI :: Status bar

  private createStatusBar(): HTMLDivElement {
    return this.createDiv('status-bar', this.recordingIndicator);
  }

  private createRecordingIndicator(): HTMLSpanElement {
    return this.createCodicon('record', 'recording-indicator');
  }

  //  Initialization :: UI :: Shared

  private createDiv(className: string, ...children: HTMLElement[]): HTMLDivElement {
    const element = this.document.createElement('div');
    element.className = className;
    for (const child of children) {
      element.appendChild(child);
    }
    return element;
  }

  private createCodicon(codiconKey: string, ...extraClasses: string[]): HTMLSpanElement {
    const codicon = this.document.createElement('span');
    codicon.classList.add('codicon', `codicon-${codiconKey}`, ...extraClasses);
    return codicon;
  }

  //  Initialization :: Message

  private initializeMessageHandling(): void {
    this.window.addEventListener(
      'message',
      ({ data }: MessageEvent<PanelViewProxyMessage<RenderingAreaData, RenderingAreaOptions, RenderingAreaUpdateData>>) =>
        this.onPanelViewProxyMessageReceived(data)
    );
  }

  //  Event processing :: UI :: Tool bar

  //  (None; all UI event handlers are trivial and defined in-line)

  //  Event processing :: Message -> *

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
        this.enableToolBarControls();
        break;
      case 'updateRenderingArea':
        this.updateRenderingArea(message.data);
        break;
      case 'exportImage':
        this.exportImage(this.renderingArea);
        break;
      case 'startWebMRecording':
        this.startWebMRecording();
        this.setRecordingIndicatorVisibility(true);
        break;
      case 'stopWebMRecording':
        this.stopWebMRecording();
        this.updateRecordingIndicatorVisibility();
        break;
      case 'startGifRecording':
        this.startGifRecording();
        this.setRecordingIndicatorVisibility(true);
        break;
      case 'stopGifRecording':
        this.stopGifRecording();
        this.updateRecordingIndicatorVisibility();
        break;
      default:
        console.warn('Unknown message:', message);
    }
  }

  //  Event processing :: Message -> Rendering area

  protected abstract initializeRenderingArea(renderingArea: HTMLDivElement, data: RenderingAreaData, options: RenderingAreaOptions): void;

  protected abstract updateRenderingArea(data: RenderingAreaUpdateData): void;

  protected abstract exportImage(renderingArea: HTMLDivElement): void;

  protected webMRecordingInProgress(): boolean {
    return false;
  }

  protected startWebMRecording(): void {
    throw new Error('WebM recording not supported; starting not possible');
  }

  protected stopWebMRecording(): void {
    throw new Error('WebM recording not supported; stopping not possible');
  }

  protected gifRecordingInProgress(): boolean {
    return false;
  }

  protected startGifRecording(): void {
    throw new Error('Gif recording not supported; starting not possible');
  }

  protected stopGifRecording(): void {
    throw new Error('Gif recording not supported; stopping not possible');
  }

  //  Event processing :: Message -> Tool bar

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

  private enableToolBarControls(): void {
    this.toolBarControls.forEach((control) => (control.disabled = false));
  }

  private get toolBarControls(): (Button | Dropdown)[] {
    return [...this.toolBarButtons, this.stackFramesDropdown];
  }

  //  Event processing :: Message -> Status bar

  private updateRecordingIndicatorVisibility(): void {
    this.setRecordingIndicatorVisibility(this.webMRecordingInProgress() || this.gifRecordingInProgress());
  }

  private setRecordingIndicatorVisibility(visible: boolean): void {
    this.recordingIndicator.style.visibility = visible ? 'visible' : 'hidden';
  }

  //  Utilities :: I/O

  protected downloadBlobFile(fileName: string, blob: Blob): void {
    DebuggerPanel.processBlobAsObjectUrl(blob, (url) => this.downloadFile(fileName, url));
  }

  protected static processBlobAsObjectUrl(blob: Blob, processObjectUrl: (url: string) => void): void {
    const url = URL.createObjectURL(blob);
    processObjectUrl(url);
    URL.revokeObjectURL(url);
  }

  protected downloadFile(fileName: string, url: string): void {
    const anchor = this.document.createElement('a');
    anchor.download = fileName;
    anchor.href = url;
    anchor.click();
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
