// N26: V29's measurement (history-movement demo/harness/v29.js) on this slice. From is typed as 1000-01-01
// through the input's own setter; every animation frame records the longest gap between frames (how long
// the page could not respond) until Day by day shows weekly rows. Polled from the shell through __done.
(() => {
  window.__done = undefined; window.__t0 = performance.now();
  const i = document.querySelectorAll('main input[type=date]')[0];
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(i, '1000-01-01');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  i.dispatchEvent(new Event('change', { bubbles: true }));
  window.__readBack = i.value;
  window.__probe = []; let last = performance.now(); window.__gap = 0;
  const tick = () => {
    const now = performance.now();
    window.__gap = Math.max(window.__gap, now - last); last = now;
    const lis = document.querySelectorAll('.nb-reaches-log li');
    const weekly = lis.length > 0 && /^week of/.test(lis[0].querySelector('.nb-reaches-site')?.textContent ?? '');
    const t = now - window.__t0;
    window.__probe.push([Math.round(t), lis.length]);
    if (t < 180000 && !weekly) requestAnimationFrame(tick);
    else { window.__done = Math.round(t); window.__rows = lis.length; window.__fromAfter = i.value; }
  };
  requestAnimationFrame(tick);
  return 'typed 1000-01-01; the box reads ' + i.value;
})()
