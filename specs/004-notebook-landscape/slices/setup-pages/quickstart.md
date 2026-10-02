# Quickstart — slice `setup-pages`

## See it

The setup steps are what Cairn shows before protection is on, so a browser alone reaches them. With no core, though,
there are no categories and an address cannot be added. The demo fake core (`demo/fake-core.js`, loaded before the
page, answering in the page itself; nothing is written or sent) fills them in. With `npm run dev` serving, for
example, on port 1431:

```sh
agent-browser --init-script specs/004-notebook-landscape/slices/setup-pages/demo/fake-core.js \
  open 'http://127.0.0.1:1431/'
```

- no flags: protection off, nine categories, the disclosure with its details; an added address reads back off.
- `?readback=in_force` or `?readback=not_verified`: what an added address reads back as.
- `?wait=1`: turning a category off answers a waiting change, so its note shows.
- `?details=none`: Before Cairn changes anything without its details.

Then:

1. Choose **Morning** on **Look (testing)**. The choosing step is one spread: on the left What would you like to
   protect?, its sentence and the categories; on the right Anywhere else?, the address box and **Protect it**, and
   **Turn protection on** at the foot.
2. Tick and untick a category. Type `Example.com/path` and choose **Protect it**: the sentence that comes back sits
   under the box. Type `localhost`: the reason comes back in amber.
3. Choose **Turn protection on**. Before Cairn changes anything is a spread: what changes on the left; What this
   does not cover and the note on administrators on the right, then **Yes, set this up** and **Not yet** at the foot.
   **Not yet** goes back to choosing.
4. Choose **Midday** and **Night**: the same spreads, re-lit. Tab through every control: each shows a dark outline
   on the paper. Shrink the window to 800×600: nothing overlaps, and the page scrolls inside the notebook.
5. Choose **Current**: both steps are exactly as before this slice.

**The application** (`npm ci`, then `npm run tauri dev`): Cairn opens on the choosing step while protection is off.
The same steps as above, with the real core.

## Check it

```sh
npx vitest run src/shell src/screens src/look
npm test && npm run lint && npm run check
npm run build && ! grep -rl "Look (testing)" dist/
```

## Not working yet

- No real-browser layout check runs in CI (frame T024): the fit at 800×600 is checked by eye in the demo.
