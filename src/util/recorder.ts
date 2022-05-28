export abstract class Recorder<Data, Context> {
  private context?: Context;
  protected abstract format: string;

  get isRecording(): boolean {
    return Boolean(this.context);
  }

  startRecording(onDataReady: (data: Data) => void): void {
    if (this.isRecording) {
      throw new Error(`${this.format} recording already running`);
    }
    this.context = this.startRecordingImplementation(onDataReady);
    if (!this.isRecording) {
      throw new Error(`${this.format} recording not started`);
    }
  }

  stopRecording(): void {
    if (!this.isRecording) {
      throw new Error(`${this.format} recording not running`);
    }
    const { context } = this;
    if (!context) {
      throw new Error(`${this.format} recording not running`);
    }
    this.stopRecordingImplementation(context);
    this.context = undefined;
    if (this.isRecording) {
      throw new Error(`${this.format} recording not stopped`);
    }
  }

  protected abstract startRecordingImplementation(onDataReady: (data: Data) => void): Context;

  protected abstract stopRecordingImplementation(context: Context): void;
}
