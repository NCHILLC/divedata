# Gradle cache in CI (2026-11-21)

The android job caches Gradle with `gradle/actions/setup-gradle`, placed after `npx expo prebuild`,
because `android/` only exists once prebuild has run. It uses `cache-provider: basic`, the open-source
(MIT) provider; the default provider is a commercial library. `--build-cache` lets Gradle reuse task
outputs from the cache. Only `main` writes the cache; pull requests read it.
