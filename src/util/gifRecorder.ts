import { Recorder } from './recorder';
import gifEncoder = require('gif-encoder-2-browser');
import { createCanvas } from 'canvas';

interface GifRecordingContext {
  interval: ReturnType<typeof setInterval>;
  frames: ImageData[];
  height: number;
  width: number;
  frameDuration: number;
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
    const frameDuration = 80;
    const frames: ImageData[] = [];

    const interval = setInterval(() => {
      const context = this.canvas?.getContext('2d');
      if (context) {
        frames.push(context.getImageData(0, 0, width, height));
      }
    }, frameDuration);

    return {
      interval: interval,
      frames: frames,
      height: height,
      width: width,
      frameDuration: frameDuration,
      onDataReady: onDataReady,
    };
  }

  protected stopRecordingImplementation(recordingContext: GifRecordingContext): void {
    clearInterval(recordingContext.interval);
    const encoder = new gifEncoder(recordingContext.width, recordingContext.height);
    encoder.setDelay(recordingContext.frameDuration);
    encoder.setQuality(30);
    encoder.start();

    const tempCanvas = createCanvas(recordingContext.width, recordingContext.height);
    const tempContext = tempCanvas.getContext('2d');

    void recordingContext.frames
      .reduce((promise, frame) => promise.then(() => this.renderFrameGifReording(tempContext, encoder, frame)), Promise.resolve())
      .then(() => {
        encoder.finish();
        recordingContext.onDataReady(new Blob([encoder.out.getData()]));
        console.warn('DebuggerPanel.stopGifRecording', 'handler', recordingContext);
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
