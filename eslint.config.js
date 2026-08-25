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

      // FR-030a: recorded reaches are visible on exactly one screen, reached
      // by deliberate navigation. A count in a header, a tray, or a badge is a
      // reminder of the thing someone is trying to walk away from.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../ipc/reaches',
              message:
                'Only the Reaches screen may read reaches (FR-030a). Nothing else may put a count in front of someone who did not ask to see it.',
            },
            {
              name: './ipc/reaches',
              message:
                'Only the Reaches screen may read reaches (FR-030a). Nothing else may put a count in front of someone who did not ask to see it.',
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

  // The one screen allowed to read them.
  {
    files: ['src/screens/Reaches.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
