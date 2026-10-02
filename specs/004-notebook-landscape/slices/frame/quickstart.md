# Quickstart — slice `frame`

## Prerequisites

`npm ci`. For the desktop app, the webview libraries `delivery/survey/running.md` lists.

## 1. Today's interface is untouched

```sh
npm test
```

Expect every existing test in `src/screens/__tests__/` to pass unchanged. They render the default look,
Current (SC-009).

## 2. See the morning look

```sh
npm run tauri dev
```

Expect the window to open at 1280×800, looking exactly as it does today, with a small "Look (testing)" switch at
the top right. Choose **Morning**. Expect:

- the peach sky, a low sun, three hill layers and the five-stone cairn on a hill at the lower left;
- the Cairn mark at the top left;
- "Good morning." with today's weekday and time, which changes when the minute does;
- the notebook, with paper tabs on its right edge: the same tabs today's header shows, under the same rules.

Choose **Current** to go back. Anything typed in Tonight is still there.

Without the core (browser only): `npm run dev` and open `http://127.0.0.1:1420`. The shell renders; data that
comes from the core does not (see `delivery/survey/running.md`).

## 3. Small window and keyboard

Shrink the window to 800×600. Expect the greeting to move above the notebook, nothing to overlap, and the page
to scroll inside the notebook. Press Tab from the top. Expect focus to reach the switch, every tab and every
control, with a visible focus ring.

## 4. No switch in a released build (SC-002)

```sh
npm run build && ! grep -rl "Look (testing)" dist/
```

Expect the build to succeed and the search to find nothing.

## 5. The guards

```sh
npm run check && npm run lint
```

Expect all eight guards to pass, unchanged.
