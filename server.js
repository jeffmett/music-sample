'use strict';

const
  express = require('express'),
  cookie_parser = require('cookie-parser'),
  mw = require('./server/middleware'),
  port = process.env.PORT || 8080

express()
  .use(express.json())
  .use(cookie_parser())
  .use(express.static(`${__dirname}/client`))
  .use('/v0', /*mw.require_login,*/ require('./server/api/v0'))
  .use('/', require('./server/routes'))
  .disable('x-powered-by')
  .listen(port, ø => {
    console.log(`reporting for duty on port ${port}`);
  });
