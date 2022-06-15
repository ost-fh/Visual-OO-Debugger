import { Recorder } from './recorder';
import gifEncoder = require('gif-encoder-2-browser');
import { createCanvas } from 'canvas';

interface GifRecordingContext {
  interval: ReturnType<typeof setInterval>;
  frames: ImageData[];
  height: number;
  width: number;
  frameRate: number;
  onDataReady: (data: Blob) => void;
}

export class GifRecorder extends Recorder<Blob, GifRecordingContext> {
  protected readonly format = 'GIF';
  constructor(private readonly canvas: HTMLCanvasElement) {
    super();
  }


  protected startRecordingImplementation(onDataReady: (data: Blob) => void): GifRecordingContext {
    const canvas = this.canvas;
    const height = canvas.height;
    const width = canvas.width;
    const frameRate = 80;

    this.recordFramesGifRecording();
    const interval = setInterval(() => this.recordFramesGifRecording(), frameRate);

    const recordingContext = {
      interval: interval,
      frames: [],
      height: height,
      width: width,
      frameRate: frameRate,
      onDataReady: onDataReady,
    };

    return recordingContext;
  }

  private recordFramesGifRecording(): void {
    const context = this.canvas?.getContext('2d');
    if (context && this.recordingContext) {
      this.recordingContext.frames.push(context.getImageData(0, 0, this.recordingContext.width, this.recordingContext.height));
    }
  }

  protected stopRecordingImplementation(recordingContext: GifRecordingContext): void {
    clearInterval(recordingContext.interval);
    const encoder = new gifEncoder(recordingContext.width, recordingContext.height);
    encoder.setDelay(recordingContext.frameRate);
    encoder.setQuality(30);
    encoder.start();

    const tempCanvas = createCanvas(recordingContext.width, recordingContext.height);
    const tempContext = tempCanvas.getContext('2d');

    void recordingContext.frames
      .reduce((promise, frame) => promise.then(() => this.renderFrameGifReording(tempContext, encoder, frame)), Promise.resolve())
      .then(() => {
        encoder.finish();
        recordingContext.onDataReady(new Blob([encoder.out.getData()]));
        console.warn('DebuggerPanel.stopGifRecording', 'handler', this.recordingContext);
      });
  }

  private renderFrameGifReording(context: CanvasRenderingContext2D, encoder: gifEncoder, frame: ImageData): Promise<void> {
    return new Promise<void>((resolve) => {
      context.putImageData(frame, 0, 0);
      encoder.addFrame(context);
      resolve();
    });
  }
}
