'use strict';

const
  router = require('express').Router(),
  mw = require('../middleware'),
  sdk = require('../sdk/v0'),
  api = module.exports = router
    .get('/', (req, res) => {
      res.send('<h1 align=center>todo docs</h1>')
    })

    .get('/songs', async(req, res) => {
      let {username} = req.query;
      let songs = await sdk.get_public_songs(username);
      if(songs.error) {
        res.status(500).json({error: songs.error})
      } else {
        songs.forEach(song => song.tracks = song.tracks.filter(track => (
          track.public !== false && !track.deleted
        )))
        res.json(songs);
      }
    })


    /*
     * todo consider only returning a (filtered?, sorted?) subset
     *  will be a good problem but important if users get to using
     */
    .get('/my-songs', mw.require_token, async(req, res) => {
      let {user_id} = req;
      try {
        let songs = await sdk.get_own_songs(user_id);
        res.json(songs.reverse());
      } catch(error) {
        res.status(500).json({error});
      }
    })


    .get('/song', mw.require_token, async(req, res) => {
      let {_id} = req.query;
      if(_id === '') return res.end();
      try {
        let song = await sdk.get_song(_id);
        res.json(song);
      } catch(error) {
        res.status(500).json({error});
      }
    })

    .post('/create-song', mw.require_token, async(req, res) => {
      let {user_id, body: data} = req;
      let result = await sdk.create_song({user_id, data});
      res.json(result);
    })

    .post('/update-song', mw.require_token, async(req, res) => {
      let {user_id} = req;
      let result = await sdk.update_song({user_id, ...req.body});
      res.json(result);
    })

    .post('/rename-track', mw.require_token, async(req, res) => {
      let {user_id} = req;
      let result = await sdk.rename_track({user_id, ...req.body});
      res.json(result);
    })

    .post('/track-publicity', mw.require_token, async(req, res) => {
      let {user_id} = req;
      let result = await sdk.update_track_publicity({user_id, ...req.body});
      res.json(result);
    })

    .delete('/track', mw.require_token, async(req, res) => {
      let {user_id} = req;
      let {track_id} = req.query;
      let result = await sdk.delete_track({user_id, track_id});
      res.json(result);
    })

    .post('/add-track', mw.require_token, async(req, res) => {
      let {user_id} = req;
      let {song_id, track} = req.body;
      let _id = await sdk.add_track(user_id, song_id, track);
      res.json({_id})
    })
