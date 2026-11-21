# HTML parser: node-html-parser and Zod

2026-11-20: Parsers read pages with `node-html-parser` and check what they read with Zod. A page that no longer looks the way a parser expects throws `PageChangedError` instead of returning a wrong number.

Why: `node-html-parser` is plain JavaScript, so it behaves the same on the phone and in Jest, and its license (MIT) is on the license list. A wrong score shown to a parent is worse than an error, so every value goes through a Zod check first.
