import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import LiveReader from '../../../modules/live-reader';
import { LiveSourceContext, NotifyContext, PageSourceContext, type Notify } from '../source';
import { createLive } from './live';
import { pageUrl, readPageScript, readyWhen } from './page';
import { createQueue, type Request } from './queue';

// react-native-webview 14's class type resolves its props to `never`; this gives it usable props.
type WebHandle = { injectJavaScript(script: string): void };
const Web = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebHandle> }>;

const notify: Notify | null = LiveReader && {
  alert: (title, text) => LiveReader?.notify(title, text),
  status: (title, text) => LiveReader?.setStatus(title, text),
};

/**
 * Loads DiveMeets pages one at a time in a hidden browser view, the way a person's browser would, and gives
 * them to the screens below it. When DiveMeets shows its check, the view comes up so the person can pass it;
 * the app never answers the check itself. Live mode (`useLivePage`) reads through the service's own browser instead.
 */
export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Request | undefined>();
  const [checking, setChecking] = useState(false);
  const [reader] = useState(() => createQueue(setCurrent, setChecking));
  const [follow] = useState(() => createLive(LiveReader, reader.lastPage));
  const web = useRef<WebHandle>(null);

  return (
    <PageSourceContext.Provider value={reader.load}>
      <LiveSourceContext.Provider value={follow}>
        <NotifyContext.Provider value={notify}>{children}</NotifyContext.Provider>
      </LiveSourceContext.Provider>
      {current && (
        <View style={checking ? styles.check : styles.hidden} pointerEvents={checking ? 'auto' : 'none'}>
          {checking && (
            <View style={styles.bar}>
              <Text style={styles.text} accessibilityRole="header">
                DiveMeets wants to check you&apos;re a person. Finish the check below.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                onPress={reader.notNow}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Not now</Text>
              </Pressable>
            </View>
          )}
          <Web
            key={current.id}
            ref={web}
            source={{ uri: pageUrl(current.path), headers: current.from ? { Referer: current.from } : undefined }}
            onLoadEnd={() => web.current?.injectJavaScript(readPageScript(readyWhen(current.path)))}
            onHttpError={(e) => reader.httpError(e.nativeEvent.statusCode)}
            onError={reader.failed}
            onMessage={(e) => reader.read(e.nativeEvent.data)}
          />
        </View>
      )}
    </PageSourceContext.Provider>
  );
}

const styles = StyleSheet.create({
  // Kept in the layout (not unmounted or zero-sized) so the page still loads and runs while hidden.
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0 },
  check: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0e1417', paddingTop: 40 },
  bar: { padding: 16, gap: 8, backgroundColor: '#1a2024' },
  text: { color: '#dde3e7', fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: 48,
    minWidth: 48,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#859490',
  },
  buttonText: { color: '#dde3e7', fontSize: 16, fontWeight: '600' },
});
