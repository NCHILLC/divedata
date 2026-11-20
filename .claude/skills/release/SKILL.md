---
name: release
description: Use when preparing a DiveData release (version, changelog, tag, signed APK, install page).
---

# Release

Filled in at milestone 7, the first release: version bump, changelog, tag, the signed APK built by
`release.yml` on GitHub Actions, and the install guide in `docs/install.md`.

Merge rule: release notes, the install guide, README and the release itself wait for the
maintainer's "merge it". Everything else merges once checks pass.
