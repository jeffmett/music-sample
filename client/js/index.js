'use strict';
/*
 * entry script - define Vue app and import what's needed
 * kick the whole thing off from here for now, maybe native app does something sexier
 */
import midi from "./components/midi.js";
import studio from "./components/studio.js";
import "./components/hw-table.js"; // defines a global vue component
import './components/flash.js';

import temp_song from './audio/song.js';

// chucking initialization stuff here for now
let active_song = localStorage.getItem('active-song');
fetch('/v0/my-songs')
  .then(r => r.json())
  .then(songs => {
    let pl = app.playlist = songs;
    let s = pl.find(song => song._id === active_song) || pl[0];
    app.switch_song(s);
  })
  .catch(err => console.warn('try again or confess, or both', err))
  .finally(ø => {}); // do something either way?

// chucking temporary and severely insufficient network status handlers here for now
window.on('offline', e => {
  document.trigger('flash', {type: 'saving', message: 'No Internet...'});
  window.on('online', e => {
    document.trigger('flash', {type: 'success', message: 'Got Internet'});
  }, {once: true});
})


const app = new Vue({
  el: '#app-root',
  components: {midi, studio},
  // rolling with all this garbage for now
  methods: {
    async create_song(e) {
      let btn = e && e.target && e.target.closest('.btn');
      if(btn) {
        document.trigger('flash', {type: 'saving', message: 'creating song'});
        btn.classList.add('ez-disabled');
      }
      let
        data = {
          title: `song ${app.playlist.length + 1}`,
          tempo: app.song.tempo || 60,
          public: false
        },
        song = temp_song(data),
        {title, created, tracks} = song,
        {_id, success, error} = await fetch('/v0/create-song', {
          method: 'post',
          headers: new Headers({'content-type': 'application/json'}),
          body: JSON.stringify({...data, created, tracks})
        }).then(r => r.json()),
        row = {_id, title, created, tracks, public: false};
      if(btn) btn.classList.remove('ez-disabled');
      if(error || !success) {
        document.trigger('flash', {type: 'fail', message: 'error creating song, check internet?'});
        console.log('return handle that', error)
      } else {
        document.trigger('flash', {type: 'success', message: 'song created'});
      }
      app.playlist.unshift(row);
      app.switch_song(row);
    },
    switch_song(raw) {
      // if new song is already active (clicked on active basically)
      if(raw._id === app.song._id) return;
      app.playlist.active = app.playlist.find(s => s._id === raw._id) || app.playlist[0];
      // seriously FUCK vue
      let row = document.getElementById(app.playlist.active._id);
      let active = S('.row.active', '#songs-table');
      if(active) active.classList.remove('active');
      if(row) row.classList.add('active');
      if(app.song) app.song.stop(); // fixme?
      fetch(`/v0/song?_id=${raw._id}`)
        .then(r => r.json())
        .then(res => {
          app.song = temp_song(res);
          localStorage.setItem('active-song', res._id);
        })
        .catch(console.warn);
    }
  },
  data: {
    song: temp_song({title: '', tracks: [], tempo: 120, _id: ''}), // FIXME need to figure this out at some point
    playlist: []
  }
});
