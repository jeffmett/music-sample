'use strict';
/*
 * the vue component
 */
import midi from '../app/midi.js';

export default {
  mounted() {
    document.on('midi-note', e => {
      let {pressed, note} = e.detail;
      let key = S(`[data-key="${note}"]`);
      if(key) key.classList.toggle('pressed', pressed);
    });
  },

  methods: {
    full_88() {
      let white_keys = [
        21, 23,
        24, 26, 28, 29, 31, 33, 35,
        36, 38, 40, 41, 43, 45, 47,
        48, 50, 52, 53, 55, 57, 59,
        60, 62, 64, 65, 67, 69, 71,
        72, 74, 76, 77, 79, 81, 83,
        84, 86, 88, 89, 91, 93, 95,
        96, 98, 100, 101, 103, 105,
        107, 108
      ];
      let html = `
        <div class="octave">
          <div class="white key" data-key="21"></div>
          <div class="black key" data-key="22"></div>
          <div class="white key" data-key="23"></div>
        </div> 
      `;
      for(let i = 24; i < 109; i += 12) {
        html += '<div class="octave">';
        for(let k = i; k < i + 12 && k < 109; ++k) html += `
            <div class="${white_keys.includes(k) ? 'white' : 'black'} key" data-key=${k}></div> 
        `;
        html += '</div>';
      }
      return html;
    },

    mousedown(e) {
      let elem = e.target.closest('.key');
      let key = elem && elem.dataset.key;
      if(key) {
        let release = midi.play_note(key);
        document.on('mouseup', release, {once: true});
      }
    }
  },

  template: `
    <div id="midi-container">
       <!-- todo 1. instrument selector, 2. external midi connection status, N. configurator -->
       <div 
         class="keyboard"
         v-html="full_88()"
         @mousedown="mousedown"
       ></div>
    </div> 
  `
}