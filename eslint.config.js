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
          ],
        },
      ],

      // Principle V: nothing in this release interrupts the person.
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Notification']",
          message: 'This release produces no notifications at all (FR-023).',
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

  // The two screens that legitimately hold both. There is nothing left to
  // restrict here, so the rule is off — but if a third restricted module is
  // ever added, this block must be revisited rather than inherited.
  {
    files: ['src/screens/CheckIn.tsx', 'src/screens/Day.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
