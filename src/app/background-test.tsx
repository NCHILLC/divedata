// Throwaway: milestone 2 background test. Never merged.
// See docs/superpowers/specs/2026-11-20-background-test-design.md.
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import type { ExitReason } from '../../modules/background-test';
import type { Summary } from '../spike/log';
import { useBackgroundTest, type WebHandle } from '../spike/useBackgroundTest';

// react-native-webview 14's class type resolves its props to `never`; this gives it usable props.
const Web = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebHandle> }>;

function Button(props: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[styles.button, props.disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

function summaryLines(s: Summary): string[] {
  return [
    `${s.pages} of ${s.planned} reads came back as a real page`,
    `DiveMeets check: ${s.checks}`,
    `Failed reads: ${s.errors}`,
    `Skipped because the last read was still loading: ${s.busy}`,
    `Timer ticks: ${s.ticks}`,
    `Longest wait between ticks: ${s.longestGapSeconds} seconds`,
    `Slowest reaction to a tick: ${s.maxJsDelaySeconds} seconds`,
    `Page changes: ${s.pageChanges}`,
    `Reads that started loading: ${s.steps.loadStart}, finished loading: ${s.steps.loadEnd}, sent the page back: ${s.steps.message}`,
    ...(s.lastError ? [`Last browser error: ${s.lastError}`] : []),
    ...(s.screenOnTicks === null ? [] : [`Ticks with the screen on: ${s.screenOnTicks} of ${s.ticks}`]),
    `Alerts allowed: ${s.alertsOn ? 'yes' : 'no'}`,
    `Battery optimisation on: ${s.batteryOptimized ? 'yes' : 'no'}`,
    `Battery saver on: ${s.powerSave ? 'yes' : 'no'}`,
    ...s.reasons.map((r) => `Note: ${r}`),
  ];
}

function exitLines(exits: ExitReason[]): string[] {
  return exits.map((e) => {
    const when = new Date(e.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `Android closed the app at ${when}: ${e.reason}${e.description ? ` (${e.description})` : ''}`;
  });
}

export default function BackgroundTest() {
  const webRef = useRef<WebHandle>(null);
  const test = useBackgroundTest(webRef);
  const [link, setLink] = useState('');
  const [linkRejected, setLinkRejected] = useState(false);
  const showWeb = test.stage === 'choose' || test.stage === 'check';

  const share = async () => {
    if (!test.summary) return;
    const verdict = test.summary.pass ? 'Passed' : 'Did not pass';
    const text = [verdict, ...summaryLines(test.summary), ...exitLines(test.exits), '', await test.log()].join('\n');
    await Share.share({ message: text });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title} accessibilityRole="header">
        Background test
      </Text>

      {test.stage === 'choose' && (
        <View style={styles.block}>
          <Text style={styles.body}>
            Go to the DiveMeets page to follow, or paste its link. Then tap Use this page and Start test,
            and lock the phone for 30 minutes.
          </Text>
          <TextInput
            accessibilityLabel="DiveMeets link"
            placeholder="Paste a DiveMeets link"
            placeholderTextColor="#859490"
            value={link}
            onChangeText={(value) => {
              setLink(value);
              setLinkRejected(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {linkRejected && <Text style={styles.body}>That is not a DiveMeets link.</Text>}
          <View style={styles.row}>
            <Button label="Open" onPress={() => setLinkRejected(!test.openLink(link))} />
            <Button label="Use this page" onPress={test.usePage} />
            <Button label="Start test" onPress={test.start} disabled={!test.chosenUrl} />
          </View>
          {test.chosenUrl && (
            <Text style={styles.small} numberOfLines={2}>
              Following: {test.chosenUrl}
            </Text>
          )}
        </View>
      )}

      {test.stage === 'running' && (
        <View style={styles.block}>
          <Text style={styles.body}>
            Running. Lock the phone and leave it for 30 minutes. The test stops on its own.
          </Text>
          <Button label="Stop" onPress={test.stop} />
        </View>
      )}

      {test.stage === 'check' && (
        <View style={styles.block}>
          <Text style={styles.body}>
            DiveMeets asked for a check, so the test stopped reading. The check is below if you want to
            see it.
          </Text>
          <Button label="See the result" onPress={test.showResult} />
        </View>
      )}

      {test.stage === 'result' && test.summary && (
        <ScrollView style={styles.block}>
          <Text style={styles.verdict}>{test.summary.pass ? 'Passed' : 'Did not pass'}</Text>
          {[...summaryLines(test.summary), ...exitLines(test.exits)].map((line) => (
            <Text key={line} style={styles.body}>
              {line}
            </Text>
          ))}
          <View style={styles.row}>
            <Button label="Share log" onPress={share} />
            <Button label="New test (clears this log)" onPress={test.reset} />
          </View>
        </ScrollView>
      )}

      {test.stage !== 'result' && (
        <Web
          ref={webRef}
          source={{ uri: test.url }}
          style={showWeb ? styles.web : styles.hiddenWeb}
          containerStyle={showWeb ? styles.web : styles.hiddenWeb}
          onNavigationStateChange={(nav) => test.onNavigation(nav.url)}
          onLoadStart={test.onLoadStart}
          onLoadEnd={test.onLoadEnd}
          onError={(e) => test.onLoadError(e.nativeEvent.description || `code ${e.nativeEvent.code}`)}
          onHttpError={(e) => test.onHttpError(e.nativeEvent.statusCode)}
          onMessage={test.onMessage}
          accessibilityLabel="DiveMeets page"
        />
      )}
    </View>
  );
}

// Colors are tokens from docs/design.md.
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: '#0e1417' },
  title: { color: '#dde3e7', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  block: { marginBottom: 12 },
  body: { color: '#bacac5', fontSize: 16, marginBottom: 6 },
  small: { color: '#bacac5', fontSize: 13 },
  verdict: { color: '#dde3e7', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#3c4a46',
    borderRadius: 8,
    color: '#dde3e7',
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#57f1db',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#003731', fontSize: 16, fontWeight: '600' },
  web: { flex: 1 },
  hiddenWeb: { width: 1, height: 1, opacity: 0, flex: 0 },
});
