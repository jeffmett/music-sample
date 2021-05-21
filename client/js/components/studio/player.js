'use strict';
import {buffer_png} from "../../audio/viz/full-length.js";
import {time_string} from "../../app/helpers.js";
/*
 * todo abstract scrubber, will probably need a few more implementations
 */
const scrubber = {
  props: ['song'],
  data() {
    return {
      frame: null,
      time: this.song.time
    }
  },
  computed: {
    img_src() {
      let {tracks} = this.song;
      // todo maybe add a getter/method on song.proto to get a combined buffer
      let url = tracks.length ? tracks[tracks.length - 1].img_src : '#';
      return `url(${url})`;
    },
    t_current() {
      return time_string(this.time);
    },
    t_end() {
      let end_time = Math.round(this.song.duration); // todo player or song needs separate property for handles
      return time_string(end_time);
    }
  },
  watch: {
    'song.playing'(playing) {
      if(playing) this.start();
    }
  },
  methods: {
    start() {
      let
        canvas = this.$refs.progress,
        ctx = canvas.getContext('2d'),
        width = canvas.width, height = canvas.height,
        song = this.song, duration = song.duration, x = 0,
        draw = ø => {
          x = width * song.time / duration;
          ctx.clearRect(0, 0, width, height);
          ctx.fillRect(x, 0, 1, height);
          this.time = ~~song.time;
          if(song.playing) {
            this.frame = requestAnimationFrame(draw);
          }
        }
      ctx.fillStyle = '#a00';
      this.frame = requestAnimationFrame(draw);
    },

    reset() {
      let canvas = this.$refs.progress, ctx = canvas.getContext('2d');
      cancelAnimationFrame(this.frame);
      this.time = 0;
      this.frame = requestAnimationFrame(ø => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillRect(0, 0, 1, canvas.height);
        this.start();
      });
    },

    // todo handle drag
    scrub(e) {
      let bar = e.currentTarget;
      let {song} = this;
      let {playing} = song;
      let {left, width} = bar.getBoundingClientRect();
      let x = e.clientX - left;
      song.stop();
      song.time = song.duration * x / width;
      cancelAnimationFrame(this.frame);
      this.start();
      if(playing) song.play();
    }
  },
  template: `
    <div id="scrubber" class="rel" :style="{backgroundImage: img_src}" @click="scrub">
      <canvas class="progress" ref="progress"></canvas>
      <div class="mono progress-time" v-html="t_current"></div> 
      <div class="handle left"></div> 
      <div class="handle right"></div> 
      <div class="mono progress-time" v-html="t_end"></div> 
    </div>
  `
}

export default {
  props: ['song'],
  components: {scrubber},
  data() {
    return {
      loading: false,
      waiting: false
    }
  },
  watch: {
    'song.ready'(ready) {
      // only handling bare min for now, only show loading when trying to play too early
      if(ready) {
        if(this.waiting) this.song.play();
        this.loading = this.waiting = false;
      }
    }
  },
  methods: {
    toggle_play() {
      let {song} = this;
      if(song.playing) return song.pause();
      if(song.ready) {
        song.play();
      } else {
        this.waiting = this.loading = true;
      }
    },

    // fixme too tired
    restart() {
      let {scrubs} = this.$refs;
      let {playing} = this.song;
      this.song.stop();
      scrubs.reset();
      if(playing) this.song.play();
    }
  },
  template: `
    <div class="player flex col center">
      <h3 class="mtb0">{{song.title}}</h3>
      <div id="player-ctrls">
        <i icon="skip_previous" @click="restart"></i> 
        <i 
          id="play-toggle"
          class="icon"
          :class="{loading}"
          @click="toggle_play"
        >{{song.playing ? 'pause' : 'play_arrow'}}</i> 
        <i icon="skip_next"></i> 
      </div>
      <scrubber :song="song" ref="scrubs"></scrubber> 
    </div> 
  `
}