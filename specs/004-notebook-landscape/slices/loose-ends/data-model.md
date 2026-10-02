# Data model: slice `loose-ends`

Nothing new is modelled. No entity, field, IPC type or stored value is added or changed; the screens read what they
read today.

What the tests read, for reference:

| Thing | Where | Read by |
|---|---|---|
| The switch's label and choices | `src/look/LookSwitch.tsx` (`<span>`, `CHOICES`) | the released-build search (R1) |
| The window's frame settings | `src-tauri/tauri.conf.json` `app.windows[*]` | the window-frame test (R7) |
| The window's capabilities | `src-tauri/capabilities/*.json` `permissions` | the window-frame test (R7) |
| A turn-on read-back and a refusal | `turn_protection_on` through `installFakeCore` | the confirm test (R3) |
| Each screen's states | `src/screens/__tests__/{pinCases,setupCases,tonightCases,quietCases}.ts` | the two sweeps (R4, R5) |
