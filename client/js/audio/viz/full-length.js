'use strict';
/*
 * starting simple - need draw_buffer for scrubber and track rows initially,
 * should export a chain-able function that takes multiple inputs (file, buffer, so forth), and
 * has methods to create multiple outputs (canvas, image, so forth)
 *
 * need to resist temptation to build real-time stream visualizer
 */

export function draw_buffer(canvas, buffer, color = '#fefefe', outline = '#aaa') {
  let width = canvas.width, height = canvas.height;
  let ctx = canvas.getContext('2d');
  let step = Math.ceil(buffer.length / width);
  let amp = height / 2;
  let x, y, w = 1, h;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  let top_line = new Path2D();
  let bottom_line = new Path2D();
  for(x = 0; x < width; ++x) {
    let min = 1.0, max = -1.0;
    for(let j = 0; j < step; ++j) {
      let datum = buffer[(x * step) + j];
      if(datum < min) min = datum;
      if(datum > max) max = datum;
    }
    h = Math.max(1, (max - min) * amp);
    y = (1 + min) * amp;
    ctx.fillRect(x, y, w, h);
    top_line.lineTo(x, y);
    bottom_line.lineTo(x, y + h);
  }
  ctx.stroke(top_line);
  ctx.stroke(bottom_line);
}

export function buffer_png(buffer, container, color = 'transparent', outline = '#aaa') {
  let canvas = document.createElement('canvas');
  let {width, height} = container.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;
  draw_buffer(canvas, buffer, color, outline);
  return canvas.toDataURL();
}