'use strict';
import {context} from "../../audio/index.js";
import {spin} from "./countdown.js";
import {recorder as create_recorder} from "../../audio/recorder.js";
import {recorder as midi_recorder} from '../../app/midi.js';
import {draw_buffer, buffer_png} from "../../audio/viz/full-length.js";
import {recording_dancer} from "../../audio/viz/dancing-bars.js";
import {time_string} from "../../app/helpers.js";
import create_track from "../../audio/track.js";

/*
 * TODO at some point between satisfactory recording work flow ui/ux and implementing real song, sooner the better
 *  hit the drawing board to come up with a logical way to structure stages that integrates nicely with business end
 *  aka big refactor of this whole component
 */
const
  selector = {
    props: ['state'],
    methods: {
      pick_mic() {
        this.state.elem = 'recorder';
        this.state.type = 'recording';
      },
      pick_midi() {
        this.state.elem = 'recorder';
        this.state.type = 'legacy-midi';
      },
      pick_file() {}
    },
    template: `
      <div class="flex pad rel h100 col center space-a">
        <div class="picker pick-mic" @click="pick_mic">
          <i icon="mic_none"></i>
          <div class="btn">microphone</div>
        </div>
        <div class="picker pick-midi" @click="pick_midi">
          <i icon="straighten"></i>
          <div class="btn">midi keyboard</div>
        </div>
        <div class="picker pick-file" @click="pick_import">
          <i icon="folder_open"></i>
          <div class="btn">select file</div>
        </div>
      </div>
    `
  },


  /*
   * microphone only for now, will need to abstract and refactor to handle mic &| midi
   */
  recorder = {
    props: ['state'],

    data() {
      return {
        status: 'ready', // counting, recording, review
        saving: false,
        stream: null,
        rekorder: null,
        viz: null,
        track: null,
        playing: false,
        time: 0
      }
    },

    /*
     * todo move anything requiring context somewhere else, doesn't belong in view
     */
    async mounted() {
      await context.resume();
      let canvas = this.$refs.viz;
      let metro = this.$refs.metro;
      let analyser = context.createAnalyser();
      let g = context.createGain();
      g.gain.value = 0.0; // todo hook up to or disable a volume meter depending on headphones

      // todo anything but this bullshit, need separate processes
      let src;
      if(this.state.type === 'recording') {
        let stream = this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
        src = context.createMediaStreamSource(stream);
        this.rekorder = create_recorder(src);
      } else { // todo consider imported files -- this block assumes legacy-midi -- midi will have its own deal
        g.gain.value = 1.0;
        let dest = context.createMediaStreamDestination();
        let stream = this.stream = dest.stream;
        src = context.createMediaStreamSource(stream);
        this.rekorder = midi_recorder(dest);
      }
      src.connect(analyser).connect(g).connect(context.destination);
      this.viz = recording_dancer(canvas, analyser, this.state.song.analyser);
      this.state.song.on('tick', this.flip)
    },

    beforeDestroy() {
      this.stream.getTracks().forEach(t => t.stop());
      this.state.song.off('tick', this.flip);
      this.stream = null;
    },

    methods: {
      flip() {
        this.$refs.metro.classList.toggle('flip');
      },
      /*
       * view only for now *, will need to figure out relationship between song, tracks, and recordings
       * * with stubbed out song with minimum methods needed to prototype the process
       *
       * need to figure out what to do after finishing a recording (ui/ux and so forth)
       * need to move a lot of song/metronome stuff to player, once that's hooked up
       */
      record_toggle() {
        if(/ready|review/.test(this.status)) {
          this.start_recording();
        } else {
          this.stop_recording();
        }
      },


      /*
       *
       */
      async start_recording() {
        let {countdown} = this.$refs;
        let tick_time = 60 / (Math.max(~~this.state.song.tempo, 1));
        let t0 = tick_time;
        let temp_countdown = 3; // not sure how this'll fit in
        while(tick_time < 1) tick_time += t0;

        this.status = 'counting';
        this.state.song.once('tick', ø => spin(countdown, tick_time, temp_countdown)).stop();
        let t1 = await this.state.song.play({countdown: temp_countdown});
        this.rekorder.start(t1);
        this.state.song.time = Math.max(0, this.state.song.time - 0.05);
        // todo abstract the clock, don't use timeout
        let update = setInterval(ø => {
          this.time = context.currentTime - t1;
        }, 100);
        this.status = 'recording';
        this.state.song
          .on('ended', this.stop_recording)
          .once('stop', ø => clearInterval(update));
        this.viz.recording = true;
      },


      /*
       *
       */
      async stop_recording() {
        // get the recorded audio and so forth
        this.state.song.off('ended', this.stop_recording).stop();
        let {buffer, file, duration} = await this.rekorder.stop(true);
        this.status = 'review' //'ready'; // review should be where user reviews - listen to song with newly recorded track, - and chooses to save (save then stage = null), or redo (stage = 'ready') - could be separate component if this one's cached?
        this.viz.recording = false;
        draw_buffer(this.$refs.preview, buffer);

        // todo abstract the image creation bit, maybe to a worker
        //  song image should be dynamic, maybe even reflect state (muted tracks and so forth)
        let img_buffer;
        if(this.state.song.duration) {
          let len = Math.min(...this.state.song.tracks.map(t => t.duration)) * context.sampleRate * 2;
          img_buffer = new Float32Array(len);
          img_buffer.set(buffer.slice(0, len), 0);
        }
        this.track = create_track({
          duration,
          created: new Date().toJSON(),
          type: this.state.type,
          title: `track ${this.state.song.tracks.length + 1}`,
          url: URL.createObjectURL(file),
          img_src: buffer_png(img_buffer || buffer, S('.row'))
        }, this.state.song.gain);

        // just shoving file onto track for the sake of instant deploy, no use other than in this.save
        this.track.file = file;
      },

      // todo think about what to do with discarded track, make recoverable somehow? during session only?
      restart() {
        this.state.song.stop(true);
        this.rekorder.stop();
        this.status = 'ready';
        // this.viz.color = '#eee'; // todo restart if replacing with preview during review
        this.time = 0;
        this.record_toggle();
      },

      // trying (and not testing) recursive fail handling -- really need to get service workers going
      async save(fails = 0) {
        this.saving = true;
        if(fails > 5) {
          this.saving = false;
          return document.trigger('flash', {type: 'fail', message: 'failed to save track, check internet'})
        }
        document.trigger('flash', {type: 'saving', message: 'saving track'});
        let
          {state: {song}, track} = this,
          {file} = track,

          // save the file
          filename = `${track.type || 'unknown'}-${track.created || Date.now()}`,
          url = `https://storage.googleapis.com/keys-beta.appspot.com/${filename}`,
          file_saved = await fetch(url, {
            method: 'put',
            body: file
          }).then(r => r.ok).catch(err => false);
        if(!file_saved) return this.save(fails + 1);

        // save the track
        let {_id} = await fetch('/v0/add-track', {
          method: 'post',
          headers: new Headers({'content-type': 'application/json'}),
          body: JSON.stringify({
            song_id: song._id,
            track: {
              created: track.created,
              title: track.title,
              url,
              duration: track.duration
            }
          })
        }).then(r => r.json());
        if(!_id || _id.error) return this.save(fails + 1);

        // restore ui and report success
        track._id = _id;
        song.tracks.push(track);
        this.state.elem = null;
        document.trigger('flash', {type: 'success', message: 'track saved'});
      },

      // todo abstract scrubber, implement here, make mute song option available
      // fixme this is fucked, button disabled for now
      preview_toggle() {
        if(this.playing) {
          this.state.song.play();
          this.track.stop();
          this.playing = false;
        } else {
          this.state.song.play();
          this.track
            .once('stop', e => {
              this.state.song.stop();
              this.playing = false;
            })
            .play();
          this.playing = true;
        }
      }
    },

    computed: {
      // todo this is getting out of control, need to figure the status bullshit
      //  different statuses have entirely different buttons, styles, handlers, and so forth
      rec_btn_txt() {
        return {
          ready: 'record',
          recording: 'stop',
          review: 'restart'
        }[this.status];
      },

      t_string() {
        return time_string(this.time, true);
      }
    },

    template: `
      <div class="flex rel h100 col center space-b" :class="status" :style="{'pointer-events': saving ? 'none' : 'all', opacity: saving ? 0.5 : 1}">
        <div class="pad metronome" ref="metro"></div>
        
        <canvas ref="preview" v-show="status === 'review'"></canvas>
        
        <div class="clock" v-html="t_string"></div>
        
        <div class="btns pad flex flex1 center" style="background:#fefefe;">
          <span 
            v-show="status === 'review'"
            :icon="playing ? 'stop' : 'play_arrow'"
            @click="preview_toggle"
            class="btn ez-disabled"
          >{{playing ? 'stop' : 'play'}}</span>
          <span 
            v-show="status !== 'counting'"
            icon="fiber_manual_record"
            class="record btn m-5"
            @click="record_toggle"
          >{{rec_btn_txt}}</span>
          <span 
            v-show="status === 'recording'"
            class="btn m-5"
            icon="loop"
            @click="restart"
          >restart</span>
          <span 
            v-show="status === 'review'"
            @click="save"
            class="green btn"
            icon="thumb_up"
          >save</span>
          <div ref="countdown" class="countdown" v-show="status === 'counting'"></div>
        </div>
        <canvas ref="viz"></canvas>
      </div> 
    `
  }


/*
 *
 */
export default {
  components: {selector, recorder},
  props: ['song'],
  watch: {
    song(s) {
      this.state.song = s;
    }
  },
  data() {
    return {
      state: {
        elem: null,
        song: this.song
      }
    }
  },
  template: `
    <div class="recorder rel">
      <component
        v-if="state.elem"
        :is="state.elem"
        :state="state"
      ></component>
      <div v-else class="h100 flex center">
        <span 
          class="green btn"
          icon="add_circle_outline"
          @click="state.elem = 'selector'"
        >add track</span> 
      </div>
    </div> 
  `
}

