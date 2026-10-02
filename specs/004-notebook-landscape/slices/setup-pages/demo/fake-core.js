// A fake, in-page Cairn core for the demo only, loaded as a browser init script before the page's
// first navigation (agent-browser --init-script <this file>). It answers the calls the setup steps
// need (choosing what to protect, Anywhere else?, Before Cairn changes anything), so a plain browser
// on `npm run dev` can reach them in every state. It lives in the browser; nothing is written
// anywhere and nothing is sent anywhere.
//
//   (no flags)               protection off, nine categories, the disclosure with its details,
//                            an added address reads back as protection off
//   ?readback=in_force       what an added address reads back as: in_force | not_verified | off
//   ?wait=1                  turning a category off answers a waiting change (its note shows)
//   ?details=none            Before Cairn changes anything without its details
//
// Typing `localhost` into the address box comes back as the reason it is kept working.
(() => {
  const params = new URLSearchParams(window.location.search);
  const readback = ['in_force', 'not_verified', 'off'].includes(params.get('readback'))
    ? params.get('readback')
    : 'off';
  const wait = params.get('wait') === '1';
  const noDetails = params.get('details') === 'none';
  const now = Math.round(Date.now() / 1000);

  const categories = [
    { id: 'adult', label: 'Adult content', enabled: true, entry_count: 640, edited: false },
    { id: 'ai', label: 'AI chat', enabled: false, entry_count: 24, edited: false },
    { id: 'gambling', label: 'Gambling', enabled: true, entry_count: 210, edited: true },
    { id: 'gaming', label: 'Gaming', enabled: false, entry_count: 96, edited: false },
    { id: 'messenger', label: 'Messengers', enabled: false, entry_count: 31, edited: false },
    { id: 'news', label: 'News', enabled: false, entry_count: 58, edited: false },
    { id: 'shopping', label: 'Shopping', enabled: true, entry_count: 77, edited: false },
    { id: 'social', label: 'Social media', enabled: true, entry_count: 88, edited: false },
    { id: 'streaming', label: 'Streaming', enabled: false, entry_count: 42, edited: false },
  ];

  // Today's lines from src-tauri/src/ipc/state.rs (`get_disclosures`, helper not installed).
  const disclosures = {
    in_force: [
      "Protected sites are blocked for every application on this machine that uses the system's own address lookup.",
      'Cairn checks its own work every minute and puts it back if something changes it.',
    ],
    not_covered: [
      'An application that looks up addresses on its own, rather than asking this machine, is not covered in this release. Some browsers can be set to do that.',
      'A browser that has already loaded a site may keep showing it from its own cache for a short while.',
    ],
    helper:
      'Cairn will ask once for permission to install a small background component. It is what keeps protection in force without asking you again, and it is removed completely when you remove Cairn.',
    encryption:
      'What Cairn records is encrypted on this machine. That protects it if the drive is copied or the machine is lost. It does not protect it from someone using this machine while it is unlocked.',
    administrator:
      'Someone with administrator access to this machine can undo what Cairn does. Cairn is a wall to walk away from, not a lock.',
  };

  let state = { status: 'off', since: null, verified_at: null, entry_count_verified: 0 };
  let added = [];

  window.__TAURI_INTERNALS__ = {
    transformCallback: () => 0,
    invoke: async (cmd, args = {}) => {
      switch (cmd) {
        case 'get_protection_state':
          // Before protection is on the answer is `off`; once an address has been added the
          // read-back is whatever the flag says.
          return added.length && state.status === 'off'
            ? { ...state, status: readback }
            : state;
        case 'list_categories':
          return categories.map((c) => ({ ...c }));
        case 'get_disclosures':
          return noDetails
            ? { in_force: [], not_covered: [], helper: '', encryption: '', administrator: '' }
            : disclosures;
        case 'set_category_enabled': {
          const category = categories.find((c) => c.id === args.id);
          if (!category) throw 'fake core: no such category';
          if (!args.on && wait) {
            return {
              id: 'pending-1',
              what: `Stop protecting ${category.label.toLowerCase()}.`,
              time_remaining: '23 hours',
              eligible_now: false,
            };
          }
          category.enabled = Boolean(args.on);
          return null;
        }
        case 'add_custom_entry': {
          const typed = String(args.input || '').trim().toLowerCase();
          if (typed.replace(/^https?:\/\//, '').split(/[/:?#]/)[0] === 'localhost') {
            throw {
              kind: 'keeps_the_machine_working',
              reason:
                'Cairn keeps localhost working — the machine and Cairn itself use it to reach things on this computer. Try the address of a site instead.',
            };
          }
          const host = typed.replace(/^https?:\/\//, '').split(/[/:?#]/)[0].replace(/^www\./, '');
          added = [host, `www.${host}`];
          return added;
        }
        case 'turn_protection_on':
          state = { status: 'in_force', since: now, verified_at: now, entry_count_verified: 1066 };
          return state;
        case 'get_trail':
          return {
            entries: [
              { domain: 'example-social.com', sources: [], auto_www: false },
              { domain: 'www.example-social.com', sources: [], auto_www: true },
            ],
            enabled_categories: ['social'],
          };
        default:
          throw new Error('fake core: ' + cmd + ' not answered');
      }
    },
  };
})();
