# Live mode reads through a browser the background service owns

2026-11-21, milestone 2 result (the background test, draft pull request 5, never merged).

**Result: it works.** A foreground service that owns its own hidden browser re-read a DiveMeets page every
30 seconds with the screen off: 10 of 10 real pages, no bot check, on a Pixel phone. It passed twice, once on
USB power and once on battery in Android's deepest power saving (forced Doze).

**What failed first:** the reader's browser lives in the screen, and with the screen off React Native holds
that browser's commands and events until the app is back on screen (0 of 59 reads). A native timer and the
JavaScript side kept running; only the screen's browser stopped.

**So:** live mode uses a browser created by the foreground service, not the screen. JavaScript tells it when
to reload through a plain native call, and the pages come back as native module events, which React Native
does not hold. Both browsers share the phone's cookie store, so a check passed on screen counts in the
service. If DiveMeets shows its check in the service's browser, live mode stops reloading and tells the
screen, which shows the check to the person as usual.

**Fallback (not built):** keep the screen on but dimmed while following a diver.

**Not tested yet:** runs longer than DiveMeets' roughly 30-minute pass, and phones with extra battery limits
(Samsung and others).
