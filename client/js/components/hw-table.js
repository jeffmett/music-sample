'use strict';
import {time_string, date_string} from "../app/helpers.js";
import {vol_slide} from "./controls/volume.js";
import {debounce} from "../app/util.js";

Vue.component('hw_table', {
  components: {vol_slide},
  props: {
    items: Array,
    row_click: {
      type: Function,
      default: new Function
    }
  },
  data() {
    return {
      sort_prop: 'created',
      flipped: false,
      title_filter: ''
    }
  },
  methods: {
    time_string, date_string,
    re_sort(prop) {
      if(this.sort_prop === prop) {
        if(this.flipped) this.sort_prop = '';
        this.flipped = !this.flipped;
      } else {
        this.sort_prop = prop;
      }
    },

    async delete_item(item) {
      let is_track = item.audio; // quick and completely nonsensical polymorphism
      let {items} = this;
      let i = items.indexOf(item);
      items.splice(i, 1);
      // todo poof
      let success = await this[is_track ? 'delete_track' : 'delete_song'](item);
      // todo if(!success) do something about it
    },

    delete_track(track) {
      track.stop();
      return fetch(`/v0/track?track_id=${track._id}`, {method: 'delete'})
        .then(r => r.json())
        .then(r => !!r.ok)
        .catch(err => false)
    },

    delete_song(song) {
      // todo handle deletion of active song
      //  can't call song.stop here since what's passed in is just the row data
      let song_id = song._id;
      return fetch('/v0/update-song', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({song_id, updates: {deleted: true}})
      })
        .then(r => !!r.ok)
        .catch(err => false)
    },

    async rename_item(item) {
      let is_track = item.audio; // more doodoo shit
      let {_id, title} = item;
      let success = await this[is_track ? 'rename_track' : 'rename_song'](_id, title);
    },

    rename_song: debounce((song_id, title) => {
      // need to make sure update applies to player
      return fetch('/v0/update-song', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({
          song_id,
          updates: {title}
        })
      }).then(r => r.ok)
    }, 300),

    rename_track: debounce((track_id, title) => {
      return fetch('/v0/rename-track', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({track_id, title})
      }).then(r => r.ok)
    }, 300),

    async toggle_publicity(item) {
      let is_track = item.audio; // more doodoo shit
      item.public = !item.public;
      let success = await this[is_track ? 'toggle_track_pub' : 'toggle_song_pub'](item);
    },

    toggle_track_pub(track) {
      let track_id = track._id;
      return fetch('/v0/track-publicity', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({track_id, pub: track.public})
      }).then(r => r.ok)
    },
    toggle_song_pub(s) { // s is the row's song data (not the song instance)
      return fetch('/v0/update-song', {
        method: 'post',
        headers: new Headers({'content-type': 'application/json'}),
        body: JSON.stringify({
          song_id: s._id,
          updates: {public: s.public}
        })
      }).then(r => r.ok)
    }
  },


  computed: {
    rows() {
      if(!this.items) return [];
      let regex = new RegExp(this.title_filter, 'i');
      let rows = this.items.filter(item => regex.test(item.title));
      if(this.sort_prop)
        rows = rows.sort((a, b) => a[this.sort_prop] < b[this.sort_prop] ? -1 : 1)
      if(this.flipped)
        rows.reverse();
      return rows;
    }
  },

  template: `
    <div class="tbl flex col">
      <div class="row head">
        <span 
           class="no-select label arrow" 
           @click="re_sort('title')" 
           :class="{hide_arrow: sort_prop !== 'title', flipped}"
        >title</span>
        <input v-model="title_filter">
        <div class="flex1"></div>
        <span 
          class="no-select label arrow"
          @click="re_sort('created')"  
          :class="{hide_arrow: sort_prop !== 'created', flipped}"
        >created</span>
        <i class="icon">more_vert</i>
      </div>
      <!-- metronome row for tracks -->      
      <slot></slot>
      
      <div class="body flex1">
        <div v-for="item in rows"
          class="row"
          :class="{active: item === items.active}"
          :style="{opacity: item.ready === false ? 0.5 : 1}"
          :id="item._id"
          :key="item._id"
          @click="row_click(item)"
        >
          <!-- public toggle / assign button, need to nail down feature specs -->
          <i 
            class="icon ml-5 pub-toggle def"
            :class="{'hover-only': !item.public}"
            @click="toggle_publicity(item)"
          >group_add</i>
          <input 
            v-model="item.title" 
            class="editable"
            @click.stop
            @input="rename_item(item)"
          />
          <!-- volume meter - tracks only  - spacer otherwise -->
          <vol_slide v-if="isFinite(item.volume)" :item="item"></vol_slide>
          <div v-else class="flex1"></div>
          <!-- duration, created -->
          <div v-html="date_string(item.created)" class="mlr1 txt-r"></div>
          
          <!-- delete, more (vert ellipse) for student submissions -->
          <i class="icon nix hover-only def" @click.stop="delete_item(item)">delete</i>
          <i class="icon hover-only no-go">more_vert</i>
        </div>
      </div>
      <div class="foot row border-t"></div>
    </div>
  `
});