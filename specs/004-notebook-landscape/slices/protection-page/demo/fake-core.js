// A fake, in-page Cairn core for the demo only, loaded as a browser init script before the page's
// first navigation (agent-browser --init-script <this file>). It answers the read calls the
// Protection and What is protected screens need, so a plain browser on `npm run dev` can reach
// them. It lives in the browser; nothing is written anywhere and nothing is sent anywhere.
//
//   ?core=in_force        protection on and checked (the default)
//   ?core=not_verified    protection on, not confirmed just now
//   &list=long            a long list (120 addresses, a very long one among them)
//
// A waiting change cannot be shown this way: the app never asks the core for one (research P6).
(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('core') === 'not_verified' ? 'not_verified' : 'in_force';
  const now = Math.round(Date.now() / 1000);

  const short = [
    { domain: 'example-social.com', sources: [], auto_www: false },
    { domain: 'www.example-social.com', sources: [], auto_www: true },
    { domain: 'news.example', sources: [], auto_www: false },
    { domain: 'slowforum.net', sources: [], auto_www: false },
  ];
  const long = [
    ...short,
    {
      domain: 'a-very-long-subdomain-that-keeps-going.and-going.example-of-a-long-address.com',
      sources: [],
      auto_www: false,
    },
    ...Array.from({ length: 115 }, (_, i) => ({
      domain: `site-${String(i + 1).padStart(3, '0')}.example`,
      sources: [],
      auto_www: i % 7 === 0,
    })),
  ];
  const entries = params.get('list') === 'long' ? long : short;

  window.__TAURI_INTERNALS__ = {
    transformCallback: () => 0,
    invoke: async (cmd) => {
      switch (cmd) {
        case 'get_protection_state':
          return {
            status,
            since: now - 3 * 86400,
            verified_at: now - 300,
            entry_count_verified: status === 'in_force' ? entries.length : entries.length - 2,
          };
        case 'get_trail':
          return { entries, enabled_categories: ['social', 'news'] };
        case 'list_categories':
          return [];
        case 'get_disclosures':
          return { in_force: [], not_covered: [], helper: '', encryption: '', administrator: '' };
        default:
          throw new Error('fake core: ' + cmd + ' not answered');
      }
    },
  };
})();
