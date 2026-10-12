// N26: what the page lays out, read through agent-browser eval. The sentences that name the first count (their
// height, lines, line height, font), the date boxes, and every count row's bar start and count width.
(() => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(100 * var(--nb-u))';
  (document.querySelector('main') || document.body).appendChild(probe);
  const u = probe.getBoundingClientRect().width / 100;
  probe.remove();
  const n = (x) => Math.round(x * 100) / 100;
  const sentences = [...document.querySelectorAll('main p')]
    .filter((p) => /^Cairn started counting/.test(p.textContent))
    .map((p) => {
      const b = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const range = document.createRange();
      range.selectNodeContents(p);
      const lines = new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size;
      return {
        text: p.textContent, cls: p.className, page: p.closest('.nb-page')?.className,
        height: n(b.height), width: n(b.width), lines, lineHeight: cs.lineHeight, fontSize: cs.fontSize,
        font: cs.fontFamily.split(',')[0], marginTop: cs.marginTop,
      };
    });
  const log = document.querySelector('.nb-reaches-log');
  const rows = [...document.querySelectorAll('.nb-reaches-log li')].map((li) => {
    const bar = li.querySelector('.nb-reaches-bar');
    const c = li.querySelector('.nb-reaches-count');
    return {
      name: li.querySelector('.nb-reaches-site')?.textContent,
      clause: li.querySelector('.nb-reaches-time')?.textContent ?? null,
      count: c ? c.firstChild.textContent : null,
      barLeft: bar ? n(bar.getBoundingClientRect().left) : null,
      barWidth: bar ? n(bar.getBoundingClientRect().width) : null,
      countWidth: c ? n(c.getBoundingClientRect().width) : null,
      rowHeight: n(li.getBoundingClientRect().height),
    };
  });
  const boxes = [...document.querySelectorAll('main input[type=date]')].map((i) => ({ value: i.value, min: i.min, max: i.max }));
  const starts = [...new Set(rows.filter((r) => r.barLeft !== null).map((r) => r.barLeft))];
  const widths = [...new Set(rows.filter((r) => r.countWidth !== null).map((r) => r.countWidth))];
  return JSON.stringify({
    locale: Intl.DateTimeFormat().resolvedOptions().locale, navigatorLanguage: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, viewport: [innerWidth, innerHeight], nbU: n(u),
    nbUOverride: document.querySelector('.nb-root')?.style.getPropertyValue('--nb-u') || null,
    heading: document.querySelector('main h2')?.textContent, boxes, sentences,
    countChars: log ? log.style.getPropertyValue('--nb-count-chars') : null,
    rowCount: rows.length, distinctBarStarts: starts, distinctCountWidths: widths,
    rows: rows.length > 14 ? [...rows.slice(0, 6), `... ${rows.length - 12} rows ...`, ...rows.slice(-6)] : rows,
  });
})()
