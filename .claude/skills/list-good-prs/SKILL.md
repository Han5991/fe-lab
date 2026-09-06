---
name: list-good-prs
description: List open pull requests in the current GitHub repository that are CLEAN or UNSTABLE and carry the review-passed 👍 reaction from github-actions[bot]. Use when the user asks which PRs are good, review-passed, or ready to merge; this skill only reports them and never changes repository state.
---

# List Good PRs

Report the current repository's open pull requests that satisfy both of these
conditions:

- GitHub `mergeStateStatus` is exactly `CLEAN` or `UNSTABLE`.
- The pull request itself has a `+1` reaction from `github-actions[bot]`.

Reactions on reviews, review comments, and issue comments do not qualify.

## Where the reaction comes from

`.github/workflows/claude-code-review.yml` posts it. After the `claude[bot]`
review is published, a follow-up step reads the reviewer's `review-verdict.txt`
and adds the `+1` when the verdict is `PASS` — that is, when the review found no
`critical` or `high` severity finding. It removes the reaction when the verdict is
`BLOCK`, when the file is missing, or when the review step failed.

The workflow runs on `opened` and `synchronize`, so the reaction tracks the current
head: a new push re-evaluates and can take the 👍 away.

Two things this reaction is **not**:

- Not a human approval. It is a bot verdict on code and prose quality.
- Not a CI result. `UNSTABLE` in GitHub's `MergeStateStatus` means _mergeable with a
  non-passing **non-required** check_; a failing or pending **required** check yields
  `BLOCKED`, which this filter already excludes. So a listed row's required checks are
  green — but a non-required one may not be. Read the column, do not treat it as "CI is
  entirely green".

### Absence of the reaction is not a verdict

**A missing 👍 does not mean the review found something.** It collapses four different
states, and only the first is a real verdict:

| Why there is no reaction                                                                                                                                    | How to tell                                                                                                     |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| Review ran and found `critical`/`high`                                                                                                                      | A `claude[bot]` summary comment exists with those severities                                                    |
| **PR touches `.github/workflows/claude-code-review.yml`** — `claude-code-action` refuses to run when that file differs from the default branch, and exits 0 | Run finishes in ~10s; Actions annotation `Skipping action due to workflow validation`; no `claude[bot]` comment |
| **Fork PR** — `secrets.CLAUDE_CODE_OAUTH_TOKEN` is unavailable, so the review step fails                                                                    | The `claude-review` check is red                                                                                |
| Bot-authored PR — the workflow skips non-human actors except Renovate `deps-major`                                                                          | The job is skipped entirely                                                                                     |

When a PR you expected is missing from the list, check which of these it is before
reporting it as "review found problems". The first is the only one that means that.

## Workflow

1. Confirm that `gh` and `jq` are installed, `gh` is authenticated, the current
   directory belongs to a Git repository, and
   `gh repo view --json nameWithOwner,url` resolves a GitHub repository.
2. Enumerate open PR numbers, then fetch each PR individually and filter the
   individual result. Do not request or filter `mergeStateStatus` from
   `gh pr list`: its aggregate results can disagree with a direct PR query.

   **`UNKNOWN` is not a state, it is "not computed yet."** GitHub calculates
   mergeability lazily, so the first query after a push returns `UNKNOWN`. Dropping
   those rows silently removes healthy PRs from the list. Re-query once, and if it
   is still `UNKNOWN`, report it separately rather than as "not merge-ready".

3. For each `CLEAN` or `UNSTABLE` PR, use GitHub's issue reactions endpoint to
   fetch every page of top-level `+1` reactions. Pull requests use their PR
   number as the issue number for this endpoint. Match the actor login exactly.

   Run this read-only Bash query from the repository:

   ```bash
   set -euo pipefail

   reactor='github-actions[bot]'
   fields='number,title,url,author,headRefName,baseRefName,mergeStateStatus,updatedAt'

   open_pr_numbers="$(
     gh pr list --state open --limit 1000 --json number --jq '.[].number'
   )"
   good_prs=()
   unknown_prs=()

   if [[ -n "$open_pr_numbers" ]]; then
     while IFS= read -r pr_number; do
       pr="$(gh pr view "$pr_number" --json "$fields")"
       state="$(jq -r '.mergeStateStatus' <<< "$pr")"

       # 지연 계산이라 push 직후 첫 조회는 UNKNOWN이다. 한 번 더 묻는다.
       if [[ "$state" == "UNKNOWN" ]]; then
         sleep 3
         pr="$(gh pr view "$pr_number" --json "$fields")"
         state="$(jq -r '.mergeStateStatus' <<< "$pr")"
       fi

       if [[ "$state" == "UNKNOWN" ]]; then
         unknown_prs+=("$pr")
         continue
       fi

       if [[ "$state" != "CLEAN" && "$state" != "UNSTABLE" ]]; then
         continue
       fi

       reactions="$(
         gh api --paginate --slurp \
           -H 'Accept: application/vnd.github+json' \
           "repos/{owner}/{repo}/issues/${pr_number}/reactions?content=%2B1&per_page=100"
       )"
       has_plus_one="$(
         jq -r --arg reactor "$reactor" \
           'any(.[][]; .content == "+1" and .user.login == $reactor)' \
           <<< "$reactions"
       )"

       if [[ "$has_plus_one" == "true" ]]; then
         good_prs+=("$pr")
       fi
     done <<< "$open_pr_numbers"
   fi

   echo "--- GOOD ---"
   if ((${#good_prs[@]} > 0)); then
     printf '%s\n' "${good_prs[@]}"
   fi
   echo "--- UNKNOWN (mergeability not computed) ---"
   if ((${#unknown_prs[@]} > 0)); then
     printf '%s\n' "${unknown_prs[@]}"
   fi
   ```

4. Treat the newline-delimited JSON objects emitted after all queries succeed
   as authoritative. Include only PRs that satisfy both conditions; do not
   infer approval or mergeability from another field, review, or comment.
5. Report the repository name and result count, followed by a Markdown table
   containing:
   - linked PR number and title
   - `mergeStateStatus`
   - author login
   - base and head branches as `base ← head`
   - update time
6. If any PR landed in the `UNKNOWN` bucket, list those separately under a
   "mergeability not computed yet" heading and say they may qualify on a re-run.
   Never fold them into the "no good PRs" answer — that reports a transient
   computation state as a fact.
7. If the result is empty, explicitly say that the repository has no open PRs
   that are `CLEAN` or `UNSTABLE` and carry a `+1` reaction from
   `github-actions[bot]`. Do **not** phrase this as "the reviews found problems" —
   see "Absence of the reaction is not a verdict" above for the four states an
   empty list can mean.

## Failures

- If `gh` is missing, explain that GitHub CLI is required.
- If `jq` is missing, explain that `jq` is required.
- If authentication fails, report it and suggest `gh auth login`.
- If the directory is not a Git repository, ask the user to run the skill from
  a repository or provide one explicitly.
- If no GitHub remote can be resolved, report that fact and suggest configuring
  the remote or specifying `--repo OWNER/REPO`.
- If the list query, any individual PR query, any reactions query, or `jq`
  processing fails, show the concise error and stop. Never present a failed or
  partial query as an empty or complete result.
- If every open PR is filtered out at the reaction step, say so plainly rather
  than implying the reviews failed. On a repository whose review workflow has not
  run since this reaction was introduced, no PR will carry one yet.

This skill is read-only. Never merge, close, label, comment on, react to, or
otherwise modify a pull request or repository.
