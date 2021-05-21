'use strict';
/*
 * todo doc, refactor for performance
 */
var S = window.S = function(selector, context) {
  context = context || document;
  if(!(context instanceof EventTarget))
    context = S(context);

  let elem = selector instanceof EventTarget
    ? selector
    : context.querySelector(selector);

  return elem || null;
};

// todo create special array with methods for things like SS('.stuff').on('click', ...)
var SS = window.SS = function(selector, context) {
  context = context || document;
  if(!(context instanceof Node))
    context = S(context);
  return [].slice.call(context.querySelectorAll(selector));
};

// monkey patching is bad, mmmkay
EventTarget.prototype.on = function() {
  this.addEventListener.apply(this, arguments)
  return this;
};
EventTarget.prototype.off = function() {
  this.removeEventListener.apply(this, arguments)
  return this;
};
EventTarget.prototype.trigger = function(name, detail) {
  this.dispatchEvent.apply(this, [new CustomEvent(name, {detail})]);
  return this;
};


// todo
//  1. put somewhere better
//  2. make settable
//  3. figure out the cleanest way to get dynamic scripts into every page
//     which we'll soon need for stuff like first-timers, browser-specifics, so forth
document.cookies = (function(raw) {
  try {
    return raw
      .split(';')
      .reduce(function(a, b) {
        let [key, val] = b.split('=');
        return Object.assign(a, {[key.trim()]: val});
      }, {});
  } catch(error) {
    console.warn('failed to parse cookies');
    return {};
  }
}(document.cookie));
