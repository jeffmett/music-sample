'use strict';
/*
 * built-in ticking this time, for metronome and more fun later
 */
import {context} from "./index.js";
import track from "./track.js";

const handlers = Symbol('handlers');

export default function(data) {
  let song = create_song(data);
  // hook up tracks, audio graph, all that
  song.gain = context.createGain();
  song.analyser = context.createAnalyser();
  song.tracks = song.tracks.map(t => track(t, song.gain));
  song.delay = context.createDelay(0.1);
  // song.delay.delayTime.setValueAtTime(0.025, context.currentTime);
  song.gain.connect(song.analyser).connect(song.delay).connect(context.destination);
  song.trigger_end = song.trigger_end.bind(song);

  return song;
}

function create_song(data) {
  let metronome = {
    disabled: data.metronome_off,
    volume: +localStorage.getItem('metronome') || 1,
    analyser: context.createAnalyser(),
    _id: 'metronome'
  }
  Object.setPrototypeOf(metronome, listener);

  return Object.assign(Object.create(proto), {
    created: new Date().toJSON(),
    offset: 0,
    start_time: 0,
    play_speed: 1,
    playing: false,
    metronome,
    tempo: 60,
    tracks: [],
    artist: ''
  }, data);
}

const proto = {
  async play({countdown = 0, fade = 0} = {}) {
    if(this.playing) return this.start_time;
    let tick_time = 60 / (~~this.tempo || 60); // yeah, this bit needs to be up here too, to make sure
    let t0 = tick_time;
    if(t0) while(t0 < 1) t0 += tick_time;
    let countdown_time = countdown * t0;
    await context.resume();

    // should be okay to add listener every play since listeners is a set and this adds by reference
    // still, definitely need a more intentional process
    this.tracks.forEach(t => {
      t.on('ended', this.trigger_end);
    });

    return new Promise(resolve => {
      let g = context.createGain();
      let to, d, osc, counting = !!countdown, ended, tick = wait => {
        to = setTimeout(ø => this.trigger('tick'), wait * 1000);
        tick_time = 60 / (~~this.tempo || 60); // yeah, must be here - user can and definitely will change while metronome is ticking
        d = context.createDelay(Math.max(wait, 1e-9));
        d.delayTime.setValueAtTime(wait, context.currentTime);
        g.gain.setValueAtTime(this.metronome.volume || 0, context.currentTime);
        ended = e => {
          d.disconnect();
          if(counting || (this.playing && !this.metronome.disabled)) tick(wait)
        };
        osc = context.createOscillator().on('ended', ended);
        osc.frequency.value = 900;
        osc.connect(g)
          .connect(d)
          .connect(this.metronome.analyser)
          .connect(context.destination);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + tick_time);
        g.gain.exponentialRampToValueAtTime(1e-5, context.currentTime + 0.025);
      }
      let delay = context.createOscillator().on('ended', ø => {
        this.start_time = context.currentTime;
        this.playing = true;
        this.tracks.forEach(t => t.play(this.offset));
        this.trigger('play');
        counting = false;
        resolve(this.start_time);
      });
      delay.start(context.currentTime);
      delay.stop(context.currentTime + countdown_time);
      this.cancel_tick = ø => {
        clearTimeout(to);
        osc.off('ended', ended).stop();
        d.disconnect();
      }
      let tick_offset = this.offset && tick_time - (this.offset % tick_time);
      tick(tick_offset);
    });
  },

  pause(fade = 0) {
    if(this.playing) {
      this.cancel_tick();
      this.playing = false;
      this.offset += (context.currentTime - this.start_time) * this.play_speed;
      this.tracks.forEach(t => t.stop()); // todo put on a timer
      this.trigger('pause');
      this.start_time = 0;
    }
  },

  stop(fade) {
    if(this.playing) {
      this.cancel_tick();
      this.tracks.forEach(t => t.stop()); // todo put on a timer
      this.playing = false;
      this.trigger('stop');
      this.start_time = this.offset = 0;
    }
  },

  get time() {
    let progress = this.playing
      ? Math.max(0, context.currentTime - this.start_time)
      : 0;
    return this.offset + progress * this.play_speed;
  },

  set time(t) {
    this.offset = t;
    this.tracks.forEach(trk => trk.audio.currentTime = t); // todo shouldn't need to access trk.audio this time
  },

  get duration() {
    let durations = [...this.tracks].map(t => t.duration + t.offset);
    return Math.max(...durations, 0) || 0;
  },
  set duration(d) {}, // need to figure this out, either stop saving/setting, or something

  trigger_end(e) {
    // another way to do this could be check that this.time >= this.duration
    // need to figure out how to handle the unfortunate fact that an Audio's load
    // state isn't entirely predictable or transparent, although service workers and
    // definitely native apps will have a much easier time dealing with it
    if(!this.tracks.some(t => t.playing)) {
      this.tracks.forEach(t => t.off('ended', this.trigger_end));
      this.stop();
      this.trigger('ended');
    }
  },

  get ready() {
    return this.tracks.every(t => t.ready);
  },
  set ready(ready) {}, // probably not settable...

  cancel_tick() {} // stub
}

/*
 * todo move this, deserves its own module
 */
export const listener = new Proxy({
  on(event, ƒ) {
    this[handlers][event] = this[handlers][event] || new Set;
    this[handlers][event].add(ƒ);
    return this;
  },
  off(event, ƒ) {
    let handler = this[handlers][event];
    if(handler) handler.delete(ƒ);
    return this;
  },
  once(event, ƒ) {
    let f = (...args) => {
      ƒ(...args);
      this.off(event, f);
    }
    this.on(event, f);
    return this;
  },
  trigger(event, data) {
    let handler = this[handlers][event];
    if(handler) handler.forEach(ƒ => ƒ(data));
    return this;
  }
}, {
  get(obj, prop) {
    if(prop in obj)
      return obj[prop];
    if(prop === handlers)
      return obj[prop] = {};
    return undefined;
  }
})

Object.setPrototypeOf(proto, listener);
