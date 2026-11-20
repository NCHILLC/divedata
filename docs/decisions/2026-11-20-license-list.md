# License list: CC-BY-4.0, MPL-2.0 and "OR" licenses

2026-11-20: The license check allows CC-BY-4.0 and MPL-2.0, and a license written as "A OR B" passes when either choice is on the list.

Why: a bare Expo app needs three build-tool packages that failed the first list: caniuse-lite (CC-BY-4.0, browser data used by Babel), lightningcss (MPL-2.0, used by Expo's bundler) and node-forge ("BSD-3-Clause OR GPL-2.0", used by Expo's command-line tool). None of them ships inside the app. The Free Software Foundation lists CC-BY-4.0 and MPL-2.0 as compatible with GPL-3.0, and with an "OR" license the user picks one choice. Every other license still fails the check.

2026-11-20: The list also accepts GPL-3.0-only, GPL-3.0-or-later, LGPL-3.0-only and LGPL-3.0-or-later. These are the current SPDX names for GPL-3.0 and LGPL-3.0, which were already allowed; the old short names alone made packages using the new names fail. The maintainer approved this the same day.
