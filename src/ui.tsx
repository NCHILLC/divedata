// Shared pieces for the screens. Colors, sizes and spacing are tokens from docs/design.md.
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RefusedError, type PageState } from './divemeets/source';

export const color = {
  background: '#0e1417',
  surfaceLow: '#161c20',
  surface: '#1a2024',
  outlineVariant: '#3c4a46',
  outline: '#859490',
  text: '#dde3e7',
  textMuted: '#bacac5',
  primary: '#57f1db',
  myDiver: '#2dd4bf',
  onPrimary: '#003731',
  error: '#ffb4ab',
};

// shortcut: system monospace stands in for JetBrains Mono; bundle the design fonts when the look is polished.
const numbers = { fontFamily: 'monospace' } as const;

export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title }} />
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.heading} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Num({ children, big }: { children: React.ReactNode; big?: boolean }) {
  return <Text style={[styles.num, big && styles.bigNum]}>{children}</Text>;
}

/** `label` is what a screen reader says; `text`, when given, is the shorter word shown. `selected` fills it too. */
export function Button(props: { label: string; text?: string; onPress: () => void; filled?: boolean; selected?: boolean }) {
  const filled = props.filled || props.selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={props.selected === undefined ? undefined : { selected: props.selected }}
      onPress={props.onPress}
      style={[styles.button, filled && styles.buttonFilled]}
    >
      <Text style={[styles.buttonText, filled && styles.buttonTextFilled]}>{props.text ?? props.label}</Text>
    </Pressable>
  );
}

/** A tappable card. `label` is what a screen reader says; `highlight` marks my diver. */
export function Card(props: { label: string; onPress: () => void; highlight?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={[styles.card, props.highlight && styles.cardHighlight]}
    >
      {props.children}
    </Pressable>
  );
}

export function MyDiverTag() {
  return <Text style={styles.tag}>My diver</Text>;
}

/** Shows loading and errors in plain words; `children` draws the page once it has loaded. */
export function PageView<T>(props: { state: PageState<T>; reload: () => void; children: (data: T) => React.ReactNode }) {
  const { state } = props;
  if (state.status === 'ready') return <>{props.children(state.data)}</>;
  if (state.status === 'loading') {
    return (
      <View style={styles.row}>
        <ActivityIndicator color={color.primary} />
        <Body muted>Loading from DiveMeets…</Body>
      </View>
    );
  }
  const { error } = state;
  return (
    <View style={styles.block}>
      <Text style={styles.errorText}>{errorWords(error)}</Text>
      {error instanceof RefusedError && (
        <Button label="Open DiveMeets in your browser" onPress={() => Linking.openURL(error.url)} />
      )}
      <Button label="Try again" onPress={props.reload} />
    </View>
  );
}

function errorWords(error: Error): string {
  if (error.name === 'CheckNeededError') {
    return "DiveMeets wants to check you're a person before it shows this page. Tap Try again to see the check.";
  }
  if (error instanceof RefusedError) {
    return "DiveMeets wouldn't send this page to DiveData. Open DiveMeets in your browser and tap through to it there.";
  }
  if (error.name === 'PageChangedError') {
    return "DiveMeets changed this page, so DiveData can't read it right now. A newer version of DiveData may fix it.";
  }
  return "Couldn't reach DiveMeets. Check your connection, then try again.";
}

/** "1", "3 (tie)", "Exhibition", or "No place yet". */
export function placeWords(r: { place?: number; tied?: boolean; exhibition?: boolean }): string {
  if (r.exhibition) return 'Exhibition';
  if (r.place === undefined) return 'No place yet';
  return r.tied ? `${r.place} (tie)` : String(r.place);
}

export const points = (n: number | undefined) => (n === undefined ? '–' : n.toFixed(2));

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: { padding: 16, gap: 16 },
  title: { color: color.text, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  heading: { color: color.text, fontSize: 20, lineHeight: 26, fontWeight: '600', marginTop: 8 },
  body: { color: color.text, fontSize: 16, lineHeight: 24 },
  muted: { color: color.textMuted, fontSize: 14, lineHeight: 20 },
  num: { ...numbers, color: color.text, fontSize: 18, lineHeight: 22, fontWeight: '600' },
  bigNum: { fontSize: 26, lineHeight: 30, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  block: { gap: 8 },
  card: {
    minHeight: 48,
    padding: 16,
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceLow,
  },
  cardHighlight: { borderColor: color.myDiver, borderWidth: 2 },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.outline,
  },
  buttonFilled: { backgroundColor: color.primary, borderColor: color.primary },
  buttonText: { color: color.text, fontSize: 16, fontWeight: '600' },
  buttonTextFilled: { color: color.onPrimary },
  tag: {
    alignSelf: 'flex-start',
    color: color.onPrimary,
    backgroundColor: color.myDiver,
    borderRadius: 999,
    paddingHorizontal: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  errorText: { color: color.error, fontSize: 16, lineHeight: 24 },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.outline,
    color: color.text,
    backgroundColor: color.surface,
    fontSize: 16,
  },
});
