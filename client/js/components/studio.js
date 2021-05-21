'use strict';
/*
 * for layout development only - starting off with everything in this file
 * each component should be abstracted and imported
 */
import recorder from './studio/recorder.js';
import player from "./studio/player.js";
import {vol_slide} from "./controls/volume.js";
import {debounce} from "../app/util.js";

const mixer = {
  props: ['song'],
  template: `
    <div class="mixer"></div> 
  `
}

export default {
  components: {player, recorder, mixer, vol_slide},
  props: ['song'],
  methods: {
    save_tempo: debounce(song => {
      fetch('/v0/update-song', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({song_id: song._id, updates: {tempo: song.tempo}})
      })
        .then(r => r.json())
        .then(r => console.log(r))
        .catch(console.warn)
    }, 300),
    increment_tempo(n) {
      let {song} = this;
      if(song.tempo <= 1 && n < 1) return song.tempo = 1;
      let k, rapid_fire = setTimeout(ø => {
        document.body.style.cursor = 'pointer';
        rapid_fire = setInterval(ø => {
          if(song.tempo > 1) song.tempo += n;
        }, 75);
      }, 400);
      document.on('mouseup', ø => {
        clearTimeout(rapid_fire);
        clearInterval(rapid_fire);
        document.body.style.cursor = '';
        this.save_tempo(song);
      }, {once: true});
      song.tempo += n;
    },
    toggle_metronome(e) {
      let {song} = this;
      song.metronome.disabled = !song.metronome.disabled;
      fetch('/v0/update-song', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({song_id: song._id, updates: {metronome_off: song.metronome.disabled}})
      })
        .then(r => r.json())
        .then(r => console.log(r))
        .catch(console.warn)
    }
  },
  template: `
    <div id="studio-container">
      <player :song="song"></player>
      <recorder :song="song"></recorder>
      <mixer :song="song"></mixer>
      <hw_table class="tracks" :items="song.tracks">
        <div class="metro row" :class="{off: song.metronome.disabled}">
          <!-- toggle -->
          <i 
            class="toggle icon pointer"
            @click="toggle_metronome"
          >{{song.metronome.disabled ? 'toggle_off' : 'toggle_on'}}</i>
          <!-- label -->
          <span>metronome</span>
          <!-- tempo input -->
          <div id="tempo-input">
            <i class="icon pointer no-select" @mousedown="increment_tempo(-1)">remove_circle_outline</i> 
            <span class="val no-select">{{song.tempo}}</span>
            <i class="icon pointer no-select" @mousedown="increment_tempo(1)">add_circle_outline</i> 
          </div>
          <!-- volume -->
          <vol_slide :item="song.metronome"></vol_slide>
        </div>
      </hw_table>
    </div> 
  `
}