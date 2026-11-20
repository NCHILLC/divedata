/** Layer rules. Run with `npm run check:layers`. See AGENTS.md "Layers". */
module.exports = {
  forbidden: [
    {
      name: 'screens-never-call-reader',
      comment: 'Screens get DiveMeets data through parsers and scoring, never straight from the reader.',
      severity: 'error',
      from: { path: '^src/app' },
      to: { path: '^src/divemeets/reader' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
