// N28: Over time's rows, read through agent-browser eval (and WebKitGTK's run_javascript). For every row: where
// the name's text ends (its text, not its box, since a one-line name can overflow its box), where the bar starts
// and ends, the gap between the two in units of --nb-u, how many lines the name takes, and whether anything in
// the row reaches past the page or makes the document scroll sideways.
(() => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(100 * var(--nb-u))';
  (document.querySelector('main') || document.body).appendChild(probe);
  const u = probe.getBoundingClientRect().width / 100;
  probe.remove();
  const n = (x) => Math.round(x * 100) / 100;
  const textRects = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return [...r.getClientRects()].filter((x) => x.width > 0);
  };
  const log = document.querySelector('.nb-reaches-log--bars') || document.querySelector('main .nb-reaches-log');
  if (!log) return JSON.stringify({ error: 'no log on the page' });
  const page = log.closest('.nb-page') || document.querySelector('main');
  const pageR = page.getBoundingClientRect();
  const logR = log.getBoundingClientRect();
  const rows = [...log.children].map((li) => {
    const bar = li.querySelector('.nb-reaches-bar');
    const site = li.querySelector('.nb-reaches-site');
    const count = li.querySelector('.nb-reaches-count');
    const before = bar ? [...li.children].slice(0, [...li.children].indexOf(bar)) : [];
    const nameRects = site ? textRects(site) : [];
    const labelRects = before.flatMap(textRects);
    const nameRight = nameRects.length ? Math.max(...nameRects.map((x) => x.right)) : null;
    const labelRight = labelRects.length ? Math.max(...labelRects.map((x) => x.right)) : null;
    const b = bar?.getBoundingClientRect();
    const c = count?.getBoundingClientRect();
    const lr = li.getBoundingClientRect();
    const rightMost = Math.max(lr.right, ...[...li.querySelectorAll('*')].map((e) => e.getBoundingClientRect().right));
    return {
      name: site?.textContent ?? null,
      clause: li.querySelector('.nb-reaches-time')?.textContent ?? null,
      count: count ? count.firstChild.textContent : null,
      nameLines: new Set(nameRects.map((x) => Math.round(x.top))).size,
      nameRight: nameRight === null ? null : n(nameRight),
      barLeft: b ? n(b.left) : null,
      barRight: b ? n(b.right) : null,
      barWidth: b ? n(b.width) : null,
      gapPx: b && nameRight !== null ? n(b.left - nameRight) : null,
      gapUnits: b && nameRight !== null ? n((b.left - nameRight) / u) : null,
      labelGapUnits: b && labelRight !== null ? n((b.left - labelRight) / u) : null,
      countLeft: c ? n(c.left) : null,
      countRight: c ? n(c.right) : null,
      countWidth: c ? n(c.width) : null,
      rowHeight: n(lr.height),
      rowRight: n(lr.right),
      overPage: n(rightMost - pageR.right),
    };
  });
  const withBar = rows.filter((r) => r.barLeft !== null);
  const spread = (k) => {
    const v = withBar.map((r) => r[k]);
    return v.length ? { min: Math.min(...v), max: Math.max(...v), spread: n(Math.max(...v) - Math.min(...v)) } : null;
  };
  const gaps = withBar.filter((r) => r.gapUnits !== null);
  const tight = gaps.filter((r) => r.gapUnits < 12);
  const labelTight = withBar.filter((r) => r.labelGapUnits !== null && r.labelGapUnits < 12);
  const minGap = gaps.reduce((a, r) => (a === null || r.gapUnits < a.gapUnits ? r : a), null);
  const view = [...document.querySelectorAll('main button[aria-pressed="true"]')].map((b) => b.textContent.trim());
  return JSON.stringify({
    locale: Intl.DateTimeFormat().resolvedOptions().locale, navigatorLanguage: navigator.language,
    viewport: [innerWidth, innerHeight], nbU: n(u), pressed: view,
    heading: document.querySelector('main h2')?.textContent,
    boxes: [...document.querySelectorAll('main input[type=date]')].map((i) => i.value),
    logClass: log.className, logDisplay: getComputedStyle(log).display,
    logColumns: getComputedStyle(log).gridTemplateColumns,
    rowDisplay: log.firstElementChild ? getComputedStyle(log.firstElementChild).display : null,
    supportsSubgrid: CSS.supports('grid-template-columns', 'subgrid'),
    countChars: log.style.getPropertyValue('--nb-count-chars'),
    logLeft: n(logR.left), logRight: n(logR.right), pageRight: n(pageR.right),
    docScrollWidth: document.documentElement.scrollWidth, docClientWidth: document.documentElement.clientWidth,
    pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    rowCount: rows.length, barRows: withBar.length,
    barStart: spread('barLeft'), barEnd: spread('barRight'), barWidth: spread('barWidth'), countLeft: spread('countLeft'),
    distinctCountWidths: [...new Set(withBar.map((r) => r.countWidth))],
    underTwelveUnits: tight.length, labelUnderTwelveUnits: labelTight.length,
    minGap: minGap && { name: minGap.name, gapUnits: minGap.gapUnits, gapPx: minGap.gapPx },
    wrappedNames: withBar.filter((r) => r.nameLines > 1).map((r) => [r.name, r.nameLines]),
    rowsOverPage: rows.filter((r) => r.overPage > 0.5).length,
    maxOverPage: rows.length ? Math.max(...rows.map((r) => r.overPage)) : null,
    rows,
  });
})()
