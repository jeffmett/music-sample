'use strict';
window.AudioContext = window.AudioContext || window.webkitAudioContext;
/*
 * todo here or somewhere, make a precision_timeout method that returns a function that cancels it
 */
export const context = new AudioContext;

