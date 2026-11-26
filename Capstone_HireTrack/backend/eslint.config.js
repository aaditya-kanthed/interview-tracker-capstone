// ESLint = our replacement for PMD + Checkstyle + SpotBugs
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'coverage/', 'uploads/', 'logs/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'no-console': 'warn',
      complexity: ['warn', 10],
      'max-lines-per-function': ['warn', 60],
    },
  },
  {
    // A describe() block naturally holds many tests, so the length rule does not apply
    files: ['tests/**/*.js'],
    rules: { 'max-lines-per-function': 'off' },
  },
];
