'use strict';

// todo refactor to return ƒ call result
//  or a promise, I suppose makes sense
export function debounce(ƒ, delay, now) {
  let timer;
  return function(...args) {
    let tentative = ø => {
      timer = null;
      ƒ(...args);
    }
    let go_time = now && !timer;
    clearTimeout(timer);
    timer = setTimeout(tentative, delay);
    if(go_time) ƒ(...args);
  }
}

export function throttle(ƒ, limit) {
  let throttling;
  return function(...args) {
    if(!throttling) {
      ƒ(...args);
      throttling = true;
      setTimeout(ø => throttling = false, limit);
    }
  }
}
