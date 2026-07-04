---
name: pr-fix
description: Address all PR review comments end-to-end — fetch every comment without truncation, fix each (adding regression tests for bugs), run the full test/lint/typecheck suite, adversarially self-review the diff, and produce clean separated commits. Use when working through reviewer or bot feedback on a pull request.
---

# /pr-fix

Standard loop for turning a reviewed PR into a green, merge-ready state. Encodes the
adversarial-review-before-commit routine so it doesn't have to be re-explained each session.

## 1. Fetch ALL review comments (no truncation)

- Pull the **complete** set into a file — review comments, review-thread comments, AND issue
  comments. **Never** pipe to `head`/`tail` (the user's shell also mangles pipes — see CLAUDE.md
  Shell Environment). A past session silently dropped ~22 comments to a `head -200`.
- Print the **total count** and confirm nothing was truncated before you start fixing.
- Write to a file, then read it back:
  - `gh pr view <num> --json comments,reviews,reviewThreads > /tmp/pr-meta.json`
  - `gh api repos/{owner}/{repo}/pulls/<num>/comments --paginate > /tmp/pr-review-comments.json`

## 2. Address each comment

- Make the change for every actionable comment.
- When a comment describes a bug, write a **failing regression test first**, then fix until green.
- Keep a checklist of addressed vs. intentionally-declined comments (with a reason to reply with).

## 3. Verify

- Run the full relevant **test suite + lint + typecheck**.
- Verify **every** sibling/fixture file you touched — do not generalize from one. Past "fixes"
  broke tests (ENOENT, snapshot drift, suite-end vs suite-start timestamps).

## 4. Adversarial self-review

- Re-read your own diff hunting for regressions, missing edge cases, broken snapshots/fixtures —
  not just a sanity pass. Consider spawning a dedicated reviewer subagent.
- Fix anything found, then re-run step 3.

## 5. Commit cleanly

- Make **clean, separated commits** grouped by concern.
- Use `git commit -F <file>` or multiple `-m` flags — **not heredocs** (the shell wraps them).
- Do **NOT** force-push, delete branches, or rewrite history without explicit approval (the global
  git-guard hook will also prompt on these).
