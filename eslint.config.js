import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/vendor/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      // Security guard: build DOM with h()/textContent so user text can never become markup.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use h(), setChildren() or textContent instead (XSS guard).' },
        { property: 'outerHTML', message: 'Use DOM builders instead (XSS guard).' },
        { property: 'insertAdjacentHTML', message: 'Use DOM builders instead (XSS guard).' },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/workers/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.worker, ort: 'readonly' } },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.serviceworker } },
  },
  {
    files: ['tests/**/*.js', 'tools/**/*.mjs', 'vite.config.js', 'playwright.config.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
