'use strict';
/*
 * business end of midi
 * imported from components/midi
 */
import {context} from "../audio/index.js";
import player from "../components/studio/player.js";

// basic initialization, will get more sophisticated for instrument selection
let buffers = {};
let destination = context.destination;

// todo abstract or whatever, need to update buffers when instrument gets switched
const switch_instrument = async function(instrument) {
  await context.resume();
  let note_numbers = Array(88).fill(0).map((x, i) => i + 21);
  // todo some slick way to translate selected instrument to file path
  let promises = note_numbers.map(n => fetch(`/assets/instruments/${instrument}/${n}.mp3`)
    .then(r => r.arrayBuffer())
    .then(b => context.decodeAudioData(b))
    .then(b => buffers[n] = b)
  );
  await Promise.all(promises);
};
switch_instrument('classic'); // currently classic and steinway are the options

(async() => {
  try {
    let access = await navigator.requestMIDIAccess();
    let init = access.onstatechange = e => {
      let {inputs} = access;
      if(inputs.size) for(let input of inputs.values()) {
        input.onmidimessage = e => {
          let [cmd, note, velocity] = e.data;
          midi_message(cmd, note, velocity);
        }
      }
    }
    init();
  } catch(error) {
    console.warn('do something about', error);
  }
})();


let
  pedal_down = false,
  notes_on = new Proxy({}, {
    get(playing, note) {
      return playing[note] || new Function;
    }
  }),
  midi_message = (cmd, note, velocity) => {
    if(cmd < 129) {
      notes_on[note]();
    } else if(cmd < 145) {
      //  velocity ? note_on(note, velocity) : note_off(note);
      if(velocity) {
        notes_on[note] = api.play_note(note, velocity);
      } else {
        notes_on[note](); // todo if pedal is down, queue for pedal off
      }
    } else if(cmd < 161) {
      console.log('polyphonic key pressure', {cmd, note, velocity});
    } else if(cmd < 177) {
      // todo handle sustain pedal here - not like this, but here
      // TODO IMPORTANT not this
      pedal_down = !!velocity;
      if(!pedal_down) {
        document.trigger('pedal-up');
      //   pedal_notes.forEach(kill => kill());
      //   pedal_notes = [];
      }
    } else if(cmd < 193) {
      console.log('program change', {cmd, note, velocity});
    } else if(cmd < 209) {
      console.log('channel pressure', {cmd, note, velocity});
    } else if(cmd < 225) {
      console.log('pitch blend', {cmd, note, velocity});
    } else {
      // return note_off(note, velocity, cmd);
      notes_on[note]();
    }
  },

  api = {
    switch_instrument,
    play_note(note, velocity = 127) {
      let buffer = buffers[note];
      let source = context.createBufferSource();
      let gain = context.createGain();
      let t0 = context.currentTime;
      gain.gain.value = Math.pow(velocity / 127, 3);
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(destination);
      source.start(0);

      document.trigger('midi-note', {pressed: true, note});

      // return function that will stop sound when called?
      // todo consider just setting notes_on from here rather than returning the note off function
      let kill = ø => {
        let time = context.currentTime, delay = time + 0.25 + Math.min(time - t0, 0.5);
        gain.gain.linearRampToValueAtTime(0, delay);
        source.stop(delay);
        document.trigger('midi-note', {pressed: false, note});
      }
      return ø => {
        if(pedal_down) {
          document.on('pedal-up', kill, {once: true});
        } else {
          kill();
        }
      }
    }
  }

/*
 * temporary -- old style, audio only, non-json -- recorder & same dutty handler logic
 * everything from here down is trash
 */
export const recorder = src => {
  let start_time;
  let g = context.createGain();
  let chunks = [], rec = new MediaRecorder(src.stream)
    .on('dataavailable', async e => {
      chunks.push(e.data);
    })
  g.connect(src);


  return {
    start(t) {
      start_time = t;
      destination = g;
      rec.start();
    },

    stop() {
      destination = context.destination;
      return new Promise((resolve, reject) => {
        rec.on('stop', async e => {
          let file = new Blob(chunks, {type: 'audio/wav'});
          // let array_buffer = await file.arrayBuffer();
          // let buffer = Float32Array.from(new Int8Array(array_buffer)).map(n => n / 127);
          resolve({
            buffer: new Float32Array(file.size), // fixme commented out buffer array ain't right
            file,
            duration: context.currentTime - start_time
          });
          chunks = [];
        }).stop();
      })
    }
  }
};

export default api;