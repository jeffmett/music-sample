'use strict';
import {context} from "./index.js";

const COSMO_CONST = 0.1;
const worker = new Worker('/js/workers/recorder.js');
let start_time = 0;

export function recorder(source) {
  let rec = Object.create(proto);
  rec.processor = context.createScriptProcessor(2048, 2, 2);
  source.connect(rec.processor).connect(context.destination);
  return rec;
}

const proto = {
  start(t1) {
    start_time = t1;
    this.processor
      .on('audioprocess', process)
      .on('audioprocess', e => {
        let dt = context.currentTime - t1;
        let trim = e.inputBuffer.duration - dt; // theoretical trim is the part of the buffer that didn't get recorded between when song started playing and now
        trim = COSMO_CONST + trim; // biggest blunder?
        let rate = e.inputBuffer.sampleRate;
        worker.postMessage({cmd: 'init', trim, rate})
      }, {once: true})
  },

  async stop(save) {
    let buffer, file, duration = context.currentTime - start_time;
    await new Promise(res => {
      this.processor.on('audioprocess', e => {
        this.processor.off('audioprocess', process);
        worker.on('message', ({data}) => {
          buffer = data.buffer; // todo process buffer into image
          file = data.file;
          duration = data.duration
          res();
        }, {once: true}).postMessage({
          cmd: 'stop',
          save,
          duration
        })
      }, {once: true});
    });
    return {buffer, file, duration}
  }
}

function process(e) {
  worker.postMessage({
    cmd: 'record',
    buffers: [
      e.inputBuffer.getChannelData(0),
      e.inputBuffer.getChannelData(1)
    ]
  })
}