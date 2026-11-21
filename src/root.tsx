// The app's root: Expo Router's own app with the reader around it. This lives outside src/app so the
// screens never import the reader (AGENTS.md "Layers"); they get pages through src/divemeets/source.ts.
import { App } from 'expo-router/build/qualified-entry';
import { ReaderProvider } from './divemeets/reader';

export function Root() {
  return (
    <ReaderProvider>
      <App />
    </ReaderProvider>
  );
}
