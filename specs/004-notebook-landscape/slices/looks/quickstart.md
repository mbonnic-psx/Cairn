# Quickstart — slice `looks`

## See it

```sh
npm install
npm run tauri dev
```

Or, for the interface alone in a browser: `npm run dev`, then open the URL Vite prints.

1. Cairn opens on today's interface. The switch, top right, reads **Look (testing)** and shows **Current**.
2. Choose **Morning**, then **Midday**, then **Night**. Each time the sky, hills, sun or moon, cairn, greeting,
   tabs and notebook change together, at once.
   - Midday: a golden sky, the sun high, golden hills, "Midday."
   - Night: a dark sky with a few stars, the moon, dark hills, light glowing stones, a lamp-lit notebook,
     "Good evening."
3. Open Tonight, type a line, switch looks: the screen and the line stay.
4. Tab through the tabs and the switch at night: the focus outline is visible against the dark sky.

## Check it

```sh
npx vitest run src/look src/shell
npm test && npm run lint && npm run check
npm run build && grep -c "Look (testing)" dist/assets/*.js   # 0: a released build has no switch
```
