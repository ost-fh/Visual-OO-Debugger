import { Recorder } from './recorder';

export class WebMRecorder extends Recorder<Blob, Pick<MediaRecorder, 'stop'>> {
  protected readonly format = 'WebM';
  private static readonly mimeType = 'video/webm; codecs=vp9';

  constructor(private readonly canvas: HTMLCanvasElement) {
    super();
  }

  protected startRecordingImplementation(onDataReady: (data: Blob) => void): Pick<MediaRecorder, 'stop'> {
    const { mimeType } = WebMRecorder;
    const { canvas } = this;
    const recorder = new MediaRecorder(canvas.captureStream(), {
      mimeType,
    });
    const streamBlobs: Blob[] = [];
    let snapshotBlob: Blob | null = null;
    recorder.addEventListener('dataavailable', ({ data }): void => {
      if (data.size > 0) {
        streamBlobs.push(data);
      }
    });
    canvas.toBlob((blob) => {
      snapshotBlob = blob;
    }, mimeType);
    recorder.addEventListener('stop', () => {
      const blob =
        streamBlobs.length > 0
          ? new Blob(streamBlobs, {
              type: mimeType,
            })
          : snapshotBlob;
      if (blob) {
        onDataReady(blob);
      } else {
        console.warn('No blob could be retrieved during WebM recording');
      }
    });
    recorder.addEventListener('error', ({ error }) => {
      console.warn('Stream capture error:', error);
    });
    recorder.start();
    return recorder;
  }

  protected stopRecordingImplementation(context: Pick<MediaRecorder, 'stop'>): void {
    context.stop();
  }
}
