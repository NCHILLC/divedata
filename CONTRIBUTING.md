# Contributing to DiveData

Thanks for helping. DiveData is built mostly with AI coding agents, and every agent follows one
rulebook: [AGENTS.md](AGENTS.md). Read it first; it applies to people too.

1. Open an issue (bug report or idea) so the change is agreed before work starts.
2. Make a branch, write a failing test, then the code.
3. Run the checks listed under "Commands" in AGENTS.md.
4. Open a pull request. It merges once the checks pass, except README, the install guide and
   releases, which the maintainer reviews.

No AI subscription is needed: free open-source agents such as OpenCode and Aider read AGENTS.md
(`.aider.conf.yml` loads it for Aider).

Never commit a real person's name. Saved DiveMeets pages go through `node scripts/anonymize.mjs`
first. By contributing you agree your work is licensed under GPL-3.0.
