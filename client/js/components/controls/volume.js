'use strict';

import {debounce} from "../../app/util.js";

export const vol_slide = {
  props: ['item'],
  data() {
    return {
      playing: false,
      pre_mute: 0,
      volume: localStorage.getItem(this.item._id) || 0.75
    }
  },
  mounted() {
    let {volume, item} = this;
    this.volume = isFinite(volume) ? +volume : 0.75;
    item
      .on('play', e => this.playing = true)
      .on('stop', e => this.playing = false)
  },
  watch: {
    volume(vol) {
      this.item.volume = Math.pow(vol, 2);
      localStorage.setItem(this.item._id, vol);
    },
    playing(val) {
      if(val) this.dance();
    }
  },
  computed: {
    icon() {
      let vol = this.volume;
      if(vol <= 0.0001)
        return 'volume_off';
      if(vol <= 0.25)
        return 'volume_mute';
      if(vol <= 0.65)
        return 'volume_down';
      return 'volume_up';
    },
    right() {
      return (1 - this.volume) * 100 + '%';
    }
  },
  methods: {
    click_vol(e) {
      let {left, width} = e.currentTarget.getBoundingClientRect();
      let x = e.clientX - left;
      this.volume = x / width;
    },
    start_drag(ei) {
      let width = this.$refs.slider.offsetWidth;
      let dx, pos = ei.clientX;
      let val = this.volume;
      let drag = e => {
        e.preventDefault();
        dx = pos - e.clientX;
        val -= dx / width;
        pos = e.clientX;
        this.volume = Math.min(Math.max(0, val), 1);
      }
      document.body.style.cursor = 'grabbing';
      document
        .on('mousemove', drag)
        .on('mouseup', e => {
          document.off('mousemove', drag);
          document.body.style.cursor = '';
        })
    },
    mute_toggle(e) {
      let {pre_mute, volume} = this;
      if(pre_mute < 0.01 && volume < 0.01) this.volume = 0.75;
      [this.volume, this.pre_mute] = [this.pre_mute, this.volume];
    },
    /*
     * TODO move the viz calculations to a worker
     *  that'll be vital once we're running multiple and more complex visualizations
     *  or... could be a problem already
     */
    dance() {
      let {$refs: {canvas}, item: {analyser}} = this;
      let buffer = new Uint8Array(analyser.fftSize);
      let ctx = canvas.getContext('2d');
      let {width, height} = canvas;

      ctx.fillStyle = 'rgba(181,242,181,0.53)';
      let peak = 0;
      let newpeak = debounce(val => {
        let step = ø => {
          setTimeout(ø => {
            if(peak === val) {
              peak -= .0025;
              val -= .0025;
              step();
            }
          }, 1e3 / 30);
        };
        step();
      }, 500);
      // todo make meter legit
      //  - check if vol is accidentally legit, thing said 'peak' meters use an average - these average the top 50/256
      //  - the two bars are left and right channels, which is legit for mono items only
      //  - add yellow and red for clipping
      // https://www.pro-tools-expert.com/logic-pro-expert/logic-pro-blog/2017/12/22/logic-pro-level-meters-what-do-you-see
      let draw = ø => {
        analyser.getByteFrequencyData(buffer);
        let sorted = buffer.sort((a, b) => a < b ? 1 : -1);
        let mx = sorted.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
        let vol = mx / 256; // Math.pow(mx / 256, 2);
        let w1 = width * vol;
        let w2 = width * peak;
        let h = (height / 2) - 1;
        let y = (height / 2) + 1;
        ctx.clearRect(0, 0, width, height);
        if(this.playing) {
          ctx.fillStyle = 'rgba(82,222,91,0.44)';
          ctx.fillRect(0, 0, w1, h);
          ctx.fillRect(0, y, w1, h);
          ctx.fillStyle = '#115e17';
          ctx.fillRect(w2, 0, 1, h);
          ctx.fillRect(w2, y, 1, h);
          if(vol >= peak) {
            peak = vol;
            newpeak(vol);
          }
          requestAnimationFrame(draw);
        }
      };
      requestAnimationFrame(draw);
    }
  },
  template: `
   <div class="vol">
     <i class="icon mute-toggle pointer" @click="mute_toggle">{{icon}}</i>
     <div class="slider" ref="slider" @click="click_vol">
       <canvas ref="canvas" height="14"></canvas>
       <div
          class="knob"
          ref="knob"
          :style="{right}"
          @click.stop
          @mousedown.prevent="start_drag"
       ></div>     
     </div>
    </div> 
  `
}