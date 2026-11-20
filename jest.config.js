// Repo scripts are .mjs so they run with plain `node` on Windows and Linux.
// Jest runs them through the same Babel transform jest-expo uses for app code.
const preset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  // Files in __tests__ that only help tests (fixture readers) are not tests.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/fixtures\\.ts$'],
  transform: { '\\.mjs$': preset.transform['\\.[jt]sx?$'], ...preset.transform },
};
