// Throwaway: milestone 2 background test. Never merged. Android only.
import { NativeModule, requireNativeModule } from 'expo';

type Events = {
  onTick: (event: { seq: number; nativeAt: number }) => void;
  onFinished: (event: { reason: 'done' | 'stopped' | 'check' }) => void;
  /** The service's own browser: one step of a read. `detail` is the HTTP status for httpError. */
  onBrowserStep: (event: { step: 'loadStart' | 'loadEnd' | 'httpError' | 'error'; detail?: string }) => void;
  /** The service's own browser: the page's title and text as JSON. */
  onBrowserPage: (event: { data: string }) => void;
};

declare class BackgroundTestModule extends NativeModule<Events> {
  /** Starts the service, which opens `url` in a browser it owns (no screen involved). */
  start(intervalSeconds: number, minutes: number, url: string): void;
  /** Reloads the service's browser; the page comes back as onBrowserPage. */
  browserReload(): void;
  stop(reason: 'stopped' | 'check'): void;
  isRunning(): boolean;
  appendLog(line: string): void;
  readLog(): Promise<string>;
  clearLog(): void;
  notify(title: string, body: string): void;
  phoneState(): { batteryOptimized: boolean; powerSave: boolean; alertsOn: boolean };
  /** Android's own record of why the app last closed, newest first (up to 5). */
  exitReasons(): ExitReason[];
}

export type ExitReason = { at: number; reason: string; description: string };

export default requireNativeModule<BackgroundTestModule>('BackgroundTest');
