// V29 as measured (run through `agent-browser eval`, then polled every 4 s from the shell; an
// awaited promise exceeded agent-browser's 30 s CDP limit on the first try, and 0100-01-01 was
// refused by the screen, so this sets 1000-01-01, the earliest the From box accepts).
(() => {
  window.__demoCalls = []; window.__done = undefined; window.__t0 = performance.now();
  const i = document.querySelectorAll('input[type=date]')[0];
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(i, '1000-01-01');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  i.dispatchEvent(new Event('change', { bubbles: true }));
  window.__probe = []; let last = performance.now(); window.__gap = 0;
  const tick = () => {
    const now = performance.now();
    window.__gap = Math.max(window.__gap, now - last); last = now;
    const n = document.querySelectorAll('main li').length;
    const t = now - window.__t0;
    window.__probe.push([Math.round(t), n]);
    if (t < 180000 && !(window.__demoCalls[0] && n === window.__demoCalls[0].rows)) requestAnimationFrame(tick);
    else window.__done = Math.round(t);
  };
  requestAnimationFrame(tick);
  return 'set ' + i.value;
})()
