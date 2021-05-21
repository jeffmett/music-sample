'use strict';
/*
 * main function export takes an analyser and canvas for now
 * might be better to create and return the canvas, later
 */
export default function dancer(canvas, analyser, fill = '#fff', outline = '#888') {
  let
    stopper, dancing = true,
    width = canvas.width, height = canvas.height,
    ctx = canvas.getContext('2d'),
    space = 1, bar_width = 3,
    bars = Math.round(width / bar_width),
    bytes = new Uint8Array(analyser.frequencyBinCount),
    k = analyser.frequencyBinCount / bars,
    frame, loop = ø => {
      analyser.getByteFrequencyData(bytes);
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      for(let i = 0; i < bars; ++i) {
        let m = 0;
        let offset = Math.floor(i * k);
        for(let j = 0; j < k; ++j)
          m += bytes[offset + j];
        m /= height / k;
        ctx.fillRect(i * bar_width, height, space, -m);
        ctx.lineTo(i * bar_width, height - m);
      }
      ctx.stroke();
      if(dancing) frame = requestAnimationFrame(loop);
    }
  ctx.fillStyle = fill;
  ctx.strokeStyle = outline;
  loop();
  return {
    stop(delay = 2500) {
      if(delay) return stopper = setTimeout(ø => this.stop(0), delay);
      dancing = false;
      cancelAnimationFrame(frame);
    },
    start() {
      clearTimeout(stopper);
      dancing = true;
      loop();
    },
    set color(hex) {
      ctx.fillStyle = hex;
    }
  }
}


/*
 * specifically for recording view - visualize mic input and song together
 * one canvas so there's no latency coming from separate requestAnimationFrame calls
 * hard-coding colors and whatever else in for now
 */
export function recording_dancer(canvas, mic_analyser, song_analyser) {
  let
    stopper, recording, dancing = true,
    width = canvas.width, height = canvas.height,
    ctx = canvas.getContext('2d'),
    space = 1, bar_width = 3,
    bars = Math.round(width / bar_width),
    mic_bytes = new Uint8Array(mic_analyser.frequencyBinCount),
    song_bytes = new Uint8Array(song_analyser.frequencyBinCount),
    k = mic_analyser.frequencyBinCount / bars, // hopefully mic and song are the same, definitely should be
    frame, loop = ø => {
      mic_analyser.getByteFrequencyData(mic_bytes);
      song_analyser.getByteFrequencyData(song_bytes);
      ctx.clearRect(0, 0, width, height);
      let mic_line = new Path2D, song_line = new Path2D
      for(let i = 0; i < bars; ++i) {
        let n = 0, m = 0;
        let offset = Math.floor(i * k);
        for(let j = 0; j < k; ++j) {
          m += mic_bytes[offset + j];
          n += song_bytes[offset + j];
        }
        m /= height / k;
        n /= height / k;
        ctx.fillStyle = recording ? 'rgba(170,8,0,0.5)' : '#eee';
        ctx.fillRect(i * bar_width, height, space, -m);
        ctx.fillStyle = 'rgba(100,175,255,0.5)';
        ctx.fillRect(i * bar_width, height, space, -n);
        mic_line.lineTo(i * bar_width, height - m);
        song_line.lineTo(i * bar_width, height - n);
      }
      ctx.stroke(mic_line);
      ctx.stroke(song_line);
      if(dancing) frame = requestAnimationFrame(loop);
    }
  ctx.strokeStyle = '#888';
  loop();
  return {
    stop(delay = 2500) {
      if(delay) return stopper = setTimeout(ø => this.stop(0), delay);
      dancing = false;
      cancelAnimationFrame(frame);
    },
    set recording(is_recording) {
      recording = is_recording;
    }
  }
}