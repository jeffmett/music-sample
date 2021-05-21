'use strict';
/*
 *
 */
const
  path = require('path'),
  crypt = require('./util/krypto'),
  sdk = require('./sdk/v0'),
  middleware = module.exports = {
    async require_login(req, res, next) {
      let {sid} = req.cookies;
      let _id = sid && crypt.decrypt(sid);
      let logged_in = _id && await sdk.find_user({_id});
      if(logged_in) {
        res.cookie('username', logged_in.username.trim());
        return next();
      }
      res.sendFile(path.join(__dirname, '../client/landing.html'));
    },

    async require_token(req, res, next) {
      let {sid} = req.cookies;
      let _id = sid && crypt.decrypt(sid);
      let logged_in = _id && await sdk.find_user({_id});
      if(logged_in) {
        req.user_id = _id;
        return next();
      }
      res.sendStatus(401);
    }
  }