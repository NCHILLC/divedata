// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Jest's globals for the script tests. Listed here so lint needs no extra package.
const jestGlobals = Object.fromEntries(
  ['describe', 'test', 'it', 'expect', 'jest', 'beforeAll', 'beforeEach', 'afterAll', 'afterEach', '__dirname']
    .map((name) => [name, 'readonly']),
);

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['scripts/__tests__/**'],
    languageOptions: { globals: jestGlobals },
  },
]);
