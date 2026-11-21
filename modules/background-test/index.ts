// Throwaway: milestone 2 background test. Never merged. Android only.
import { NativeModule, requireNativeModule } from 'expo';

type Events = {
  onTick: (event: { seq: number; nativeAt: number }) => void;
  onFinished: (event: { reason: 'done' | 'stopped' | 'check' }) => void;
};

declare class BackgroundTestModule extends NativeModule<Events> {
  start(intervalSeconds: number, minutes: number): void;
  stop(reason: 'stopped' | 'check'): void;
  isRunning(): boolean;
  appendLog(line: string): void;
  readLog(): Promise<string>;
  clearLog(): void;
  notify(title: string, body: string): void;
  phoneState(): { batteryOptimized: boolean; powerSave: boolean; alertsOn: boolean };
  /** Android's own record of why the app last closed, newest first (up to 5). */
  exitReasons(): ExitReason[];
  /** Asks Android to keep the hidden browser's page process running with the screen off. Reports the old setting. */
  keepBrowserImportant(): Promise<{ found: number; requested: number; waived: boolean }>;
}

export type ExitReason = { at: number; reason: string; description: string };

export default requireNativeModule<BackgroundTestModule>('BackgroundTest');
