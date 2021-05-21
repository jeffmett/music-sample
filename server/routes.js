'use strict';
const
  {require_login} = require('./middleware'),
  sdk = require('./sdk/v0'),
  crypt = require('./util/krypto'),
  path = require('path'),
  router = require('express').Router(),
  one_year = 365/*days*/ * 24/*hrs*/ * 60/*min*/ * 60/*sec*/ * 1e3/*ms*/

module.exports = router

  .get('/', require_login, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/studio.html'));
  })

  .get('/logout', (req, res) => {
    res.clearCookie('sid').redirect('/');
  })


  /*
   * will be profile page
   * starting with single 'public site' per user
   * todo send something better and more helpful than 4OH!4
   *  also, try to make usernames case-insensitive, but preserve what they chose
   *  also, impose some reasonable username validation - needs to be a url component so yeah, needs to be simple
   */
  .get('/:username', async(req, res) => {
    let {username} = req.params;
    let user = await sdk.find_user({username});
    if(user)
      return res.sendFile(path.join(__dirname, '../client/songs.html'));
    res.sendFile(path.join(__dirname, '../client/4oh4.html'));
  })


  .post('/signup', async(req, res) => {
    let {success, sid} = await sdk.create_user(req.body);
    res
      .cookie('sid', sid, {httpOnly: true, expires: new Date(Date.now() + one_year)})
      .json({success});
  })

  .post('/login', async(req, res) => {
    let {password, login} = req.body;
    let key = login.includes('@') ? 'email' : 'username'; // FIXME
    let user = await sdk.find_user({[key]: login});
    if(user && crypt.compare(password, user.hash)) {
      let sid = crypt.encrypt(String(user._id));
      let expires = new Date(Date.now() + one_year);
      return res
        .cookie('sid', sid, {httpOnly: true, expires})
        .json({success: true});
    }
    res.json({success: false}); // todo give them something
  })


