'use strict';
import {listener} from "./song.js";
import {context} from "./index.js";
/*
 * @param data - {title, url, img_src, offset, duration
 * @param node - audio graph node
 *
 * starting by exposing track.audio for simplicity but soon it should be made 'private'
 * no one should need it except itself
 *
 * maybe instead of piping events, proxy .on so track.on('audio-event',) can be used for any audio event
 *
 * TODO figure out how to integrate .type in nicely - at first either recording or midi
 *  midi needs to be able to have instrument changed at any time
 */

export default function(data, node) {
  let
    track = Object.create(proto),
    audio = track.create_audio(data.url),
    source = context.createMediaElementSource(audio),
    gain = context.createGain(),
    analyser = context.createAnalyser();
  source
    .connect(analyser)
    .connect(gain)
    .connect(node)
  // a bulk of the upgrades need to be done here with the Audio object
  // need to get creative - maybe Proxy, many of the native Audio events are important
  // so a way to pipe them would be ideal
  // todo minimize what's exposed -- everything should be done through prototype methods
  return Object.assign(track, {
    audio,
    source,
    gain,
    analyser,
    offset: 0,
    duration: 0,
    type: 'legacy',
    public: true,
    playing: false,
    ready: false
  }, data);
}


const proto = {
  async play(t = 0) {
    if(!this.playing) {
      this.audio.currentTime = t;
      await this.audio.play();
      this.playing = true;
      this.trigger('play');
    }
  },
  stop() {
    if(this.playing) {
      this.audio.pause();
      // this.audio.currentTime = 0; // won't be needed once audio is privatized // todo prove it's not needed now
      this.playing = false;
      this.trigger('stop');
    }
  },

  create_audio(url) {
    let audio = new Audio(url)
    audio.crossOrigin = '';
    return audio
      .on('ended', e => {
        this.playing = false;
        this.trigger('ended');
      }) // and so forth
      .on('waiting', e => {
        if(this.playing) {
          let halted = context.currentTime;
          let timer = setTimeout(ø => {
            this.ready = false;
            timer = null;
          }, 100);
          audio.on('playing', ø => {
            // audio.currentTime += (context.currentTime - halted); FIXME recursive fucking hell
            if(timer) { // back in time
              clearTimeout(timer);
            } else {  // timer ran, song.ready is false
              audio.currentTime += (context.currentTime - halted); // fixme this is a second-best thing
              this.ready = true;
            }
          }, {once: true});
        }
      })
      .on('canplaythrough', e => {
        this.ready = true;
      })
  },

  get volume() {
    return this.audio.volume;
  },
  set volume(val) {
    this.audio.volume = val;
  }
}

Object.setPrototypeOf(proto, listener);
