'use strict';

const
  {MongoClient, ObjectId} = require('mongodb'),
  crypt = require('../util/krypto'),
  url = process.env.mongo_uri,
  client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});

let db, users, songs;
let connect = new Promise((resolve, reject) => {
  client.connect(err => { // todo first bug, look into this again
    if(err) return reject(err);
    // db = client.db('hallway99');
    db = client.db('music-app');
    users = db.collection('users');
    songs = db.collection('songs');
    resolve();
  });
});

const sdk = module.exports = {
  // todo consider splitting into a few find_by methods, this could be dangerous
  async find_user(props) {
    await connect;
    try {
      if('_id' in props)
        props._id = ObjectId(props._id);
      return await users.findOne(props);
    } catch(err) {
      return console.log('whoops', err); // todo figure out what exactly threw and how to handle
    }
  },


  /*
   * account creation should always be as simple as possible
   * potential upgrades to paid tier/s can always come later
   * todo (client-side plus sanity check here)
   *  - make sure email is unique
   *  - make searches case insensitive, but display as user entered
   *  - proper feedback (serve here, use nicely client-side)
   */
  async create_user(user) {
    await connect;
    try {
      let hash = crypt.hash_pass(user.password);
      let {email, username} = user;
      let r = await users.insertOne({email, username, hash});
      // good above, rethink below
      let [{_id}] = r.ops;
      let sid = await crypt.encrypt(String(_id));
      // todo send welcome (confirmation?) email, don't await it though
      return {sid, success: true}; // todo confirm success
    } catch(e) {
      console.log('create user failed', e);
      return {success: false, error: e};
    }
  },


  /*
   * temporary for hybrid pilot
   * corinne.metter.co for teachers
   * hallway99.com for students
   * old database will need to be migrated to new
   * this pulls from old, for now
   * todo don't return with tracks, fetch on song change
   *  that should stop problematic audio fetching
   */
  async get_public_songs(username) {
    await connect;
    try {
      let user = await sdk.find_user({username});
      let user_id = String(user._id);
      let songz = await songs
        .find({deleted: {$ne: true}, public: true, user_id})
        .project({user_id: 0, public: 0})
        .toArray();
      return songz;
    } catch(error) {
      console.log('error getting songs', error);
      return {error};
    }
  },


  /*
   * todo combine the two?
   *  at least change the public one to withhold tracks
   * this is for the teacher app
   */
  async get_own_songs(user_id) {
    await connect;
    user_id = String(user_id);
    let songz = await songs
      .find({deleted: {$ne: true}, user_id})
      .project({user_id: 0, tracks: 0})
      .toArray();
    return songz;
  },

  async get_song(_id) {
    await connect;
    _id = ObjectId(_id);
    let song = await songs.findOne({_id});
    song.tracks = song.tracks.filter(track => !track.deleted);
    return song;
  },

  async create_song({user_id, data}) {
    await connect;
    try {
      let new_song = Object.assign({
        user_id,
        title: 'untitled',
        duration: 0,
        tracks: [],
        tempo: 60
      }, data);
      let r = await songs.insertOne(new_song);
      let [{_id}] = r.ops;
      return {_id, success: true};
    } catch(error) {
      console.log(error)
      return {success: false, error};
    }
  },

  async update_song({user_id, song_id, updates}) {
    await connect;
    try {
      let _id = ObjectId(song_id);
      return await songs.findOneAndUpdate({user_id, _id}, {$set: updates});
    } catch(error) {
      return {error, message: 'failed to update song :('};
    }
  },

  /*
   * todo consider collaborators -- that's why the first update call is commented out
   *  so more than one person can add tracks to a song - eventually that should be piped
   *  to a web socket
   */
  async add_track(user_id, song_id, track) {
    await connect;
    try {
      let _id = ObjectId(song_id);
      track._id = ObjectId();
      // await songs.findOneAndUpdate({user_id, _id}, {$push: {tracks: track}});
      await songs.findOneAndUpdate({_id}, {$push: {tracks: track}});
      return track._id;
    } catch(error) {
      return {error}
    }
  },

  async rename_track({user_id, track_id, title}) {
    await connect;
    return await songs.findOneAndUpdate({
      user_id, 'tracks._id': ObjectId(track_id)
    }, {
      $set: {'tracks.$.title': title}
    })
  },

  async update_track_publicity({user_id, track_id, pub}) {
    await connect;
    return await songs.findOneAndUpdate({
      user_id, 'tracks._id': ObjectId(track_id)
    }, {
      $set: {'tracks.$.public': pub}
    })
  },

  async delete_track({user_id, track_id}) {
    await connect;
    return await songs.findOneAndUpdate({
      user_id, 'tracks._id': ObjectId(track_id)
    }, {
      $set: {'tracks.$.deleted': true}
    })
  }
}
