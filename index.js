// The app's entry: expo-router/entry-classic, with src/root.tsx in place of Expo Router's App.
// Keep it in step with node_modules/expo-router/entry-classic.js when Expo is upgraded.
// `@expo/metro-runtime` must be the first import.
import '@expo/metro-runtime';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { Root } from './src/root';

renderRootComponent(Root);
