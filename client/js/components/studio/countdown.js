'use strict';
/*
 * todo figure out how to invert the colors nice and cool like a movie countdown
 *  also, consider recursive call while number > 0?
 *  fuck this, dom updates 60/sec - switch to canvas
 */
export function spin(element, time, number) {
  let
    dark = getComputedStyle(element).backgroundColor,
    light = getComputedStyle(element.parentElement).backgroundColor,
    steps = Math.max(60 * time); // 60steps/sec * time(sec)
  if(number) {
    let span = document.createElement('span'); // todo consider Text? append directly?
    span.className = 'n';
    span.textContent = number;
    element.append(span);
    setTimeout(ø => requestAnimationFrame(ø => {
      span.remove();
      spin(element, time, number - 1);
    }), time * 1e3);
  }
  for(let i = 0; i < steps; ++i) {
    let angle = 360 * i / steps;
    let deg = angle <= 180 ? angle + 90 : angle - 90;
    let color = angle <= 180 ? light : dark;
    let bg = 'linear-gradient(' + deg + 'deg, transparent 50%, ' + color + ' 50%),linear-gradient(90deg, ' + light + ' 50%, transparent 50%)';
    setTimeout(ø => {
      requestAnimationFrame(ø => element.style.backgroundImage = bg);
    }, i * 1e3 / 60);
  }
}
