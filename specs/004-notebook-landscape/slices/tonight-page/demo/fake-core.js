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

  const SEALED =
    'Cairn could not open your history with the key it has, so your entries stay sealed and exactly as they are. Protection is unaffected.';
  const UNREADABLE = 'Cairn could not read your history just now. Protection is unaffected.';
  const REFUSED = 'Cairn could not save that just now.';
  const QUOTE = 'A kettle takes about as long to boil as it takes to sit down.';
  const DAY_NOTE =
    'Cairn was not running for about 25 minutes of today, so anything you reached for then is not here. This is what Cairn saw, not everything that happened.';
  const RANGE_NOTE =
    'Cairn was not running for about 3 hours of these days, so anything you reached for then is not here. This is what Cairn saw, not everything that happened.';

  // Today's reaches, set back from now so they fall inside the day asked for.
  const reachesFor = (dayStart) =>
    [
      ['example-social.com', 40 * 60],
      ['news.example', 2 * 3600 + 5 * 60],
      ['example-social.com', 3 * 3600 + 20 * 60],
      ['video.example', 5 * 3600 + 48 * 60],
      ['example-social.com', 7 * 3600 + 11 * 60],
    ]
      .map(([domain, back]) => ({ domain, at: Math.max(dayStart + 60, now - back) }))
      .sort((a, b) => a.at - b.at);

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

        case 'list_todays_reaches': {
          const day = dayView(args.dayStart);
          return {
            reaches: day.reaches,
            gaps: day.gaps,
            coverage_note: day.coverage_note,
            sealed: day.sealed,
          };
        }
        case 'summarize_reaches': {
          if (state === 'unreadable') throw UNREADABLE;
          if (state === 'sealed') {
            return { by_site: [], gaps: [], coverage_note: null, estimates_excluded: 0, sealed: SEALED };
          }
          if (state === 'empty') {
            return { by_site: [], gaps: [], coverage_note: null, estimates_excluded: 0, sealed: null };
          }
          return {
            by_site: [
              { domain: 'example-social.com', count: 41 },
              { domain: 'news.example', count: 23 },
              { domain: 'video.example', count: 17 },
              { domain: 'forum.example', count: 6 },
              { domain: 'shop.example', count: 2 },
            ],
            gaps: [{ from: args.rangeStart + 3600, to: args.rangeStart + 3600 + 3 * 3600 }],
            coverage_note: RANGE_NOTE,
            estimates_excluded: 2,
            sealed: null,
          };
        }

        case 'get_day':
          return dayView(args.dayStart);
        case 'save_journal_entry':
          if (state === 'refuse-save') throw REFUSED;
          entry = args.text;
          return dayView(args.dayStart);
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
