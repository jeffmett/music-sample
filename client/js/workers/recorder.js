'use strict';
/*
 * plan is to build this so later on it will hang on to previously abandoned recordings
 * and expose a way to recover them (during the session, at least)
 */

let
  _buffers = {left: [], right: []},
  sample_rate = 44100,
  trim_time = 0

/*
 * available commands
 */
const sdk = {
  init({rate, trim}) {
    sample_rate = rate;
    trim_time = trim;
  },

  record({buffers}) {
    let [left, right] = buffers;
    _buffers.left.push(left);
    _buffers.right.push(right);
  },

  stop({save, duration}) {
    let file, buffer;
    if(save) {
      buffer = merge_buffers(duration);
      file = make_wav(buffer);
      duration = buffer.length / (sample_rate * 2) // because 2 channels
    }
    _buffers = {left: [], right: []};
    postMessage({file, buffer, duration});
  }
}

onmessage = function({data}) {
  sdk[data.cmd](data);
};

function merge_buffers(duration) {
  let {left, right} = _buffers;
  // fuck this, applying static correction - this problem must be closer to the metal than browsers let you go
  let fat = Math.ceil(trim_time * sample_rate);

  // what used to be merge -- basically flatten, but they're typed arrays so yeah
  [left, right] = [left, right].map(buffers => {
    let len = ~~(duration * sample_rate);
    let res = new Float32Array(len);
    let flat = new Float32Array(len);
    for(let i = 0, j = 0; i < buffers.length; ++i) {
      if(j + buffers[i].length > len) // recording stopped during this last one
        buffers[i] = buffers[i].slice(0, len - j);
      flat.set(buffers[i], j);
      j += buffers[i].length;
    }

    res.set(flat.slice(fat), 0); // trim the fat
    res.set(flat.slice(-fat), len - fat); // don't forget the end
    return res;
  });

  // what used to be interleave - merge the two channel's buffers together for a stereo file
  let len = left.length + right.length;
  let res = new Float32Array(len);
  let i = 0, j = 0;
  while(i < len) {
    res[i++] = left[j];
    res[i++] = right[j];
    j++;
  }
  return res;
}

function make_wav(merged) {
  const
    buffer = new ArrayBuffer(44 + merged.length * 2),
    view = new DataView(buffer),
    write = (offset, string) => {
      for(let i = 0; i < string.length; ++i)
        view.setUint8(offset + i, string.charCodeAt(i));
    };

  write(0, 'RIFF');
  view.setUint32(4, 32 + merged.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sample_rate, true);
  view.setUint32(28, sample_rate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, merged.length * 2, true);

  for(let i = 0, offset = 44; i < merged.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, merged[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], {type: 'audio/wav'});
}
