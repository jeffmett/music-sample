'use strict';
const
  crypto = require('crypto'),
  key = process.env.key

module.exports = {

  encrypt(text) {
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + encrypted.toString('hex');
  },

  decrypt(text) {
    let iv = Buffer.from(text.slice(0, 32), 'hex');
    let encrypted_text = Buffer.from(text.slice(32), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted_text);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  },


  hash_pass(pass) {
    let salt = crypto.randomBytes(16).toString('hex');
    let hash = crypto.pbkdf2Sync(pass, salt, 1e3, 64, 'sha512').toString('hex');
    return salt + hash;
  },

  compare(pass, hash) {
    let salt = hash.slice(0, 32);
    let hashed_pass = crypto.pbkdf2Sync(pass, salt, 1e3, 64, 'sha512').toString('hex');
    return hash.slice(32) === hashed_pass;
  }
}
