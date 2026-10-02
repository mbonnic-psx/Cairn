// A fake, in-page Cairn core for the demo only: answers the read calls the Tonight
// screen makes with an empty day, so the screen can be reached in a plain browser.
// It lives in the actor's browser; nothing is written anywhere.
window.__TAURI_INTERNALS__ = {
  transformCallback: () => 0,
  invoke: async (cmd, args) => {
    const empty = { reaches: [], gaps: [], coverage_note: null, entry: null, estimate: null, sealed: null };
    switch (cmd) {
      case 'get_day': return empty;
      case 'get_quote': return null;
      case 'get_quotes_shown': return false;
      default: throw new Error('fake core: ' + cmd + ' not answered');
    }
  },
};
