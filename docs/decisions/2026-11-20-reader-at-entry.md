# The reader wraps the app at its entry

2026-11-20: Screens need DiveMeets pages but may not import the reader, not even through another module
(`npm run check:layers`). So the app's entry (`index.js`, then `src/root.tsx`) puts the reader around
Expo Router's app, and screens ask for pages with `usePage` from `src/divemeets/source.ts`. That file only
holds the shared interface, so the layer rule stays as it was. Tests give `usePage` saved pages instead
(`withPages` in `src/__tests__/fixtures.ts`).

`index.js` copies Expo Router's own entry (`expo-router/entry-classic`) with `src/root.tsx` in place of its
app, so check it against that file when Expo is upgraded.
