// Live mode's reader on Android: a foreground service that owns a hidden browser, so DiveMeets pages keep
// loading with the screen off. Only src/divemeets/reader/live.ts uses it. Null where the module is missing
// (tests, iPhone).
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import type { LiveNative } from '../../src/divemeets/reader/live';

type Events = {
  /** Every interval (30 seconds or more) while the service runs. */
  onTick: () => void;
  /** The service's browser read a page: its title, HTML and HTTP status. */
  onPage: (page: { title: string; html: string; status: number }) => void;
  /** The service's browser could not load the page at all. */
  onFailed: (e: { reason: string }) => void;
  /** The service stopped on its own: Stop in the notification, or the time limit. */
  onStopped: () => void;
};

type LiveReaderModule = NativeModule<Events> & LiveNative;

export default requireOptionalNativeModule<LiveReaderModule>('LiveReader');
