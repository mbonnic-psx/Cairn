// A fake, in-page Cairn core for the demo only, loaded as a browser init script before the page's
// first navigation (agent-browser --init-script <this file>). It answers the read calls the app makes
// on start and on the What Cairn covers tab, so a plain browser on `npm run dev` can reach that page.
// It lives in the browser; nothing is written anywhere and nothing is sent anywhere.
//
//   ?core=in_force        protection on and checked (the default)
//   ?core=not_verified    protection on, not confirmed just now
//   ?core=off             protection off (What Cairn covers still has its tab)
//   &repair=no            the background component cannot run here: one covered line instead of two
//
// The disclosure words are the core's own (src-tauri/src/ipc/state.rs, `disclosures`), copied
// verbatim so the demo shows what the application shows. This machine is as it was cannot be reached
// this way, or in the application: nothing opens it yet (D16). The tests carry it.
(() => {
  const params = new URLSearchParams(window.location.search);
  const core = params.get('core');
  const status = core === 'not_verified' || core === 'off' ? core : 'in_force';
  const canRepair = params.get('repair') !== 'no';
  const now = Math.round(Date.now() / 1000);

  const entries = [
    { domain: 'example-social.com', sources: [], auto_www: false },
    { domain: 'www.example-social.com', sources: [], auto_www: true },
    { domain: 'news.example', sources: [], auto_www: false },
  ];

  const inForce = [
    "Protected sites are blocked for every application on this machine that uses the system's own address lookup.",
  ];
  if (canRepair) inForce.push('Cairn checks its own work every minute and puts it back if something changes it.');

  const disclosures = {
    in_force: inForce,
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
    invoke: async (cmd) => {
      switch (cmd) {
        case 'get_protection_state':
          return {
            status,
            since: status === 'off' ? null : now - 3 * 86400,
            verified_at: status === 'off' ? null : now - 300,
            entry_count_verified: status === 'off' ? 0 : entries.length,
          };
        case 'get_trail':
          return { entries, enabled_categories: ['social', 'news'] };
        case 'list_categories':
          return [];
        case 'get_disclosures':
          return disclosures;
        default:
          throw new Error('fake core: ' + cmd + ' not answered');
      }
    },
  };
})();
