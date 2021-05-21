'use strict';
export function time_string(sec, precision) {
  return `
    <span>
      ${`${~~(sec / 60)}:${String(~~(sec % 60)).padStart(2, '0')}`.split('').join('</span><span>')}
      ${precision ? '</span><span>' + (sec % 1).toFixed(1).slice(1).trim().split('').join('</span><span>') : ''}
    </span>
  `;
}

export function date_string(d) {
  let date = new Date(d);
  if(/invalid/i.test(date)) { // todo handle appropriately
    return '<span></span>';
  }
  let string = date.toLocaleDateString('en-US', {month: 'numeric', day: '2-digit'});
  return `<span>${string.split('').join('</span><span>')}</span>`;
}