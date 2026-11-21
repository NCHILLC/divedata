// Repo scripts are .mjs so they run with plain `node` on Windows and Linux.
// Jest runs them through the same Babel transform jest-expo uses for app code.
const preset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  // Files in __tests__ that only help tests (fixture readers) are not tests.
  // .claude/worktrees/ holds other agent sessions' copies of the repo; their tests are not ours.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/fixtures\\.ts$', '/\\.claude/worktrees/'],
  modulePathIgnorePatterns: ['<rootDir>/\\.claude/worktrees/'],
  // The first screen test in a run compiles React Native and can pass 5 seconds on a cold CI runner.
  testTimeout: 20000,
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: { '\\.mjs$': preset.transform['\\.[jt]sx?$'], ...preset.transform },
};
