import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Rules here are not style. Two of them are constitutional controls that a code
 * review would otherwise have to catch by eye every time.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src-tauri/target'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Principle II: the frontend has no way to reach the network, and no
      // reason to want one. Everything it needs comes over Tauri commands.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Cairn makes no outbound calls (Principle II).' },
        { name: 'XMLHttpRequest', message: 'Cairn makes no outbound calls (Principle II).' },
        { name: 'WebSocket', message: 'Cairn makes no outbound calls (Principle II).' },
      ],

      // FR-030a, FR-033: reaches and journal entries are visible only on the
      // screens a person deliberately navigates to. A count in a header, a
      // tray, or a badge is a reminder of the thing someone is trying to walk
      // away from, and an entry is the most private thing Cairn holds.
      //
      // Globs rather than literal specifiers. The old form listed
      // '../ipc/reaches' and './ipc/reaches', so anything nested deeper —
      // 'src/screens/Setup/' imports at '../../ipc/reaches' — walked straight
      // past it. Verified: it did.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ipc/reaches'],
              message:
                'Only the screens someone navigates to may read reaches (FR-030a). Nothing else may put a count in front of someone who did not ask to see it.',
            },
            {
              group: ['**/ipc/journal'],
              message:
                'Only the check-in and a single day may read journal entries (FR-033). Nothing else may put what someone wrote in front of them unasked.',
            },
            {
              group: ['@tauri-apps/plugin-notification', '**/plugin-notification'],
              message:
                'Only src/announce.ts may raise the one daily announcement (FR-002, FR-005). A second module that can notify is a second thing that can interrupt someone.',
            },
          ],
        },
      ],

      // Principle V: exactly one quiet announcement a day, and nothing else,
      // ever. Slice 002 could say "no notifications at all" because it had no
      // way to send one. That sentence stops being true here, so the rule has
      // to say the narrower thing precisely instead of the broad thing loosely.
      //
      // Every selector below stays forbidden **everywhere, src/announce.ts
      // included**. None of them is how Cairn announces: the announcement goes
      // through the Tauri plugin, which is import-restricted to that one file
      // above. The browser routes are not narrowed for anybody, because each
      // one asks the person for a permission Cairn has no use for and each is
      // reachable without the single-per-day decision that makes the
      // announcement legitimate.
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Notification']",
          message:
            'The browser notification constructor is never how Cairn notifies. The one daily announcement goes through the plugin, from src/announce.ts alone (FR-002).',
        },
        {
          selector:
            "MemberExpression[object.name='Notification'][property.name='requestPermission']",
          message:
            'Cairn never asks for the browser notification permission. The one daily announcement goes through the plugin (FR-002).',
        },
        {
          selector: "CallExpression[callee.property.name='showNotification']",
          message:
            'A service-worker notification bypasses the once-a-day decision entirely (FR-004). There is one announcement path and it is src/announce.ts.',
        },
      ],
    },
  },

  // Tests do not ship, and a test for the Reaches screen needs the screen's
  // own types. The same exemption check-no-streaks.mjs and
  // check-no-ambient-counts.mjs both make, for the same reason.
  //
  // This block exists because the glob above found what the old literal paths
  // could not see: Reaches.test.tsx imports at '../../ipc/reaches', two levels
  // deep, and had been slipping past the restriction silently.
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // The screens allowed to read reaches — and still barred from journal
  // entries, which they have no business showing.
  //
  // These re-declare the rule minus one group rather than switching it off.
  // Switching it off is what the old config did, and it meant the allowed
  // screen was exempt from every restriction that would ever be added, not
  // just the one it needed. That is the same shape of hole the ambient-counts
  // guard had.
  {
    files: ['src/screens/Reaches.tsx', 'src/screens/History.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ipc/journal'],
              message:
                'Only the check-in and a single day may read journal entries (FR-033). Reaches and patterns are not the place for what someone wrote.',
            },
          ],
        },
      ],
    },
  },

  // The one module permitted to raise the announcement. It may import the
  // plugin — and, per the lesson from the allowlists above, it stays barred
  // from reaches and journal entries, which it has no business touching. It
  // decides nothing and renders nothing; it asks the core whether an
  // announcement is due and passes on the answer.
  {
    files: ['src/announce.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ipc/reaches'],
              message:
                'The announcement carries no reach data. It says a check-in is ready and nothing about what is in it (FR-002).',
            },
            {
              group: ['**/ipc/journal'],
              message:
                'The announcement carries nothing the person wrote (FR-033).',
            },
          ],
        },
      ],
    },
  },

  // The two screens that legitimately hold both reaches and journal entries —
  // and are still barred from the notification plugin, which is announce.ts's
  // alone.
  //
  // This block was written as `'no-restricted-imports': 'off'` one task ago,
  // with a comment warning that a third restricted module would have to be
  // handled here rather than inherited. A third one was added in the very next
  // task and it inherited the exemption silently. The verification matrix
  // caught it; the comment did not, because a comment cannot fail a build.
  // Hence: never `off`, always re-declare what still applies.
  {
    files: ['src/screens/CheckIn.tsx', 'src/screens/Day.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tauri-apps/plugin-notification', '**/plugin-notification'],
              message:
                'Only src/announce.ts may raise the one daily announcement (FR-002, FR-005). A screen that can notify is a screen that can interrupt someone.',
            },
          ],
        },
      ],
    },
  },
);
