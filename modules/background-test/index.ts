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
}

export default requireNativeModule<BackgroundTestModule>('BackgroundTest');
