// hand-fc (slice first-counted): history-movement's, itself v26's in-page fake core, with the three history reads forwarded to the real core.
// A fake, in-page Cairn core for the demo only, loaded as a browser init script before the page's
// first navigation (agent-browser --init-script <this file>). It answers what the app asks on start,
// and what the Today (both views) and Tonight tabs ask, so a plain browser on `npm run dev` can reach
// both spreads. It lives in the browser; nothing is written anywhere and nothing is sent anywhere.
//
//   ?core=in_force      protection on and checked (the default): a log of several reaches and a coverage
//                       note; an Over time range with several sites, counts and two estimates left out;
//                       a quote, quotes shown, and a journal whose save is kept (for this page load)
//   ?core=empty         nothing yet today, nothing over the range, no entry, no quote
//   ?core=sealed        the history cannot be opened: the Today, Over time and Tonight answers all say so
//   ?core=unreadable    Over time could not read the history (Today and Tonight are as in_force)
//   ?core=quotes-off    quotes hidden: no line, and the switch reads "Show quotes"
//   ?core=refuse-save   the journal's save is refused with the core's own sentence
//
// The words are the core's own (src-tauri/src/store/gaps.rs, store/history.rs, and the quote set in
// src-tauri/resources/quotes/quotes.json), copied verbatim, so the demo shows what the application shows.
//
// What it cannot show: a day that ends while Tonight is open, and a load that could not be made (the
// check-in's own "could not load" sentence). Both are carried by the tests (quickstart: Not working yet).
(() => {
  const params = new URLSearchParams(window.location.search);
  const core = params.get('core');
  const state = ['empty', 'sealed', 'unreadable', 'quotes-off', 'refuse-save'].includes(core)
    ? core
    : 'in_force';
  const now = Math.round(Date.now() / 1000);
  // ?seed=a (installed today) -> core on 1471; ?seed=b (counting three weeks) -> core on 1472.
  // Added for N26: ?seed=c (since 2025, counts over 999) -> 1474; ?seed=d (installed yesterday) -> 1475;
  // ?seed=e (a reach under a clock set centuries back, F6) -> 1476; ?seed=f (installed today, seeded at 17:12) -> 1478.
  // Added for N28: ?seed=g (long site names that wrap, a count over 999) -> 1479.
  const PORTS = { b: 1472, c: 1474, d: 1475, e: 1476, f: 1478, g: 1479 };
  const CORE_URL = 'http://127.0.0.1:' + (PORTS[params.get('seed')] || 1471) + '/';
  const forward = async (cmd, args) => {
    const r = await fetch(CORE_URL, { method: 'POST', body: JSON.stringify({ cmd, args }) });
    return r.json();
  };

  const SEALED =
    'Cairn could not open your history with the key it has, so your entries stay sealed and exactly as they are. Protection is unaffected.';
  const UNREADABLE = 'Cairn could not read your history just now. Protection is unaffected.';
  const REFUSED = 'Cairn could not save that just now.';
  const QUOTE = 'A kettle takes about as long to boil as it takes to sit down.';
  const DAY_NOTE =
    'Cairn was not running for about 25 minutes of today, so anything you reached for then is not here. This is what Cairn saw, not everything that happened.';
  const RANGE_NOTE =
    'Cairn was not running for about 3 hours of these days, so anything you reached for then is not here. This is what Cairn saw, not everything that happened.';

  // Today's reaches, spread over the part of the day already gone so they fall inside the day asked for,
  // however early it is.
  const reachesFor = (dayStart) => {
    const span = Math.max(now - dayStart - 120, 0);
    return [
      ['example-social.com', 0.08],
      ['news.example', 0.31],
      ['example-social.com', 0.47],
      ['video.example', 0.72],
      ['example-social.com', 0.95],
    ].map(([domain, at]) => ({ domain, at: dayStart + 60 + Math.round(span * at) }));
  };

  let entry = null;
  let quotesShown = state !== 'quotes-off';

  const dayView = (dayStart) => {
    if (state === 'sealed') {
      return { reaches: [], gaps: [], coverage_note: null, entry: null, estimate: null, sealed: SEALED };
    }
    if (state === 'empty') {
      return { reaches: [], gaps: [], coverage_note: null, entry, estimate: null, sealed: null };
    }
    return {
      reaches: reachesFor(dayStart),
      gaps: [{ from: dayStart + 3600, to: dayStart + 3600 + 25 * 60 }],
      coverage_note: DAY_NOTE,
      entry,
      estimate: null,
      sealed: null,
    };
  };

  const entries = [
    { domain: 'example-social.com', sources: [], auto_www: false },
    { domain: 'www.example-social.com', sources: [], auto_www: true },
    { domain: 'news.example', sources: [], auto_www: false },
  ];

  const disclosures = {
    in_force: [
      "Protected sites are blocked for every application on this machine that uses the system's own address lookup.",
      'Cairn checks its own work every minute and puts it back if something changes it.',
    ],
    not_covered: [
      'An application that looks up addresses on its own, rather than asking this machine, is not covered in this release. Some browsers can be set to do that.',
      'A browser that has already loaded a site may keep showing it from its own cache for a short while.',
    ],
    helper: '',
    encryption:
      'What Cairn records is encrypted on this machine. That protects it if the drive is copied or the machine is lost. It does not protect it from someone using this machine while it is unlocked.',
    administrator:
      'Someone with administrator access to this machine can undo what Cairn does. Cairn is a wall to walk away from, not a lock.',
  };

  window.__TAURI_INTERNALS__ = {
    transformCallback: () => 0,
    invoke: async (cmd, args) => {
      switch (cmd) {
        case 'get_protection_state':
          return {
            status: 'in_force',
            since: now - 3 * 86400,
            verified_at: now - 300,
            entry_count_verified: entries.length,
          };
        case 'get_trail':
          return { entries, enabled_categories: ['social', 'news'] };
        case 'list_categories':
          return [];
        case 'get_disclosures':
          return disclosures;

        // Forwarded to the REAL core (hand-hm-core serve, AppState on a seeded disposable history).
        case 'list_todays_reaches':
        case 'summarize_reaches':
        case 'get_day': {
          const answer = await forward(cmd, args);
          if (cmd === 'get_day' && entry !== null) answer.entry = entry;
          return answer;
        }
        case 'save_journal_entry':
          if (state === 'refuse-save') throw REFUSED;
          entry = args.text;
          return { ...(await forward('get_day', { day: args.day, dayStart: args.dayStart, dayEnd: args.dayEnd })), entry };
        case 'get_quote':
          return state === 'empty' ? null : QUOTE;
        case 'get_quotes_shown':
          return quotesShown;
        case 'set_quotes_shown':
          quotesShown = Boolean(args.shown);
          return quotesShown;

        default:
          throw new Error('fake core: ' + cmd + ' not answered');
      }
    },
  };
})();
