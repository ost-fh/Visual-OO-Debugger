import { expect, use } from 'chai';
import { spy } from 'sinon';
import * as sinonChai from 'sinon-chai';

import { Recorder } from './recorder';

use(sinonChai);

describe('Recorder', () => {
  interface Data {
    data: 'data';
  }
  type OnDataReady = (data: Data) => void;
  interface Context {
    stop(): void;
  }
  const format = 'Foo';
  class TestRecorder extends Recorder<Data, Context> {
    protected readonly format = format;

    protected startRecordingImplementation(onDataReady: OnDataReady): Context {
      return {
        stop(): void {
          onDataReady({
            data: 'data',
          });
        },
      };
    }

    protected stopRecordingImplementation(context: Context): void {
      context.stop();
    }
  }
  const nop: OnDataReady = () => {
    //  Do nothing
  };
  let recorder: Recorder<Data, Context>;
  beforeEach(() => {
    recorder = new TestRecorder();
  });
  afterEach(() => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    }
  });
  describe('isRecording', () => {
    it('should not be recording before the recorder is started', () => {
      expect(recorder.isRecording).to.equal(false);
    });
    it('should be recording once the recorder is started', () => {
      recorder.startRecording(nop);
      expect(recorder.isRecording).to.equal(true);
    });
    it('should not be recording once the recorder is stopped', () => {
      recorder.startRecording(nop);
      recorder.stopRecording();
      expect(recorder.isRecording).to.equal(false);
    });
  });
  describe('startRecording', () => {
    it('should prevent parallel recordings', () => {
      recorder.startRecording(nop);
      expect(() => recorder.startRecording(nop)).to.throw(format + ' recording already running');
    });
  });
  describe('stopRecording', () => {
    it('should provide data once the recording is stopped', () => {
      const onDataReady = spy();
      recorder.startRecording(onDataReady);
      recorder.stopRecording();
      expect(onDataReady).to.have.been.calledWith({
        data: 'data',
      });
    });
    it('should reject attempts to stop an non-running recording', () => {
      expect(() => recorder.stopRecording()).to.throw(format + ' recording not running');
    });
  });
});
