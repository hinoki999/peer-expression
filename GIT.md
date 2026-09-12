# Git workflow

Short version: **main is always green, work happens on short branches, and
history stays linear.** Everything below is the long version of that.

## One-time setup, on every machine

```sh
git config core.hooksPath .githooks
```

That activates the two hooks in `.githooks/`. Without it they do nothing —
git does not run hooks from a tracked directory by default.

## Starting work

```sh
git switch main
git pull
git switch -c feat/device-store        # or spike/… or safety/…
```

Branch prefixes carry meaning:

| Prefix | For | Rule |
|---|---|---|
| `feat/` | One step from the schematic's build order | Short-lived. Squash-merge. |
| `fix/` | A defect | Same |
| `spike/` | A throwaway experiment | Findings go in `docs/`; the branch is deleted |
| `safety/` | Anything on the change-control list | **Cannot merge on engineering review alone** |

The change-control list — free-text input, DMs, replies, public UGC, user
profiles, user discovery, reporting another user, requesting direct
intervention, location, author identification — needs threat, privacy and
counsel review before merge. If your branch touches one of those, it is a
`safety/` branch and the PR says why.

## Committing

```sh
git add -p                     # review each hunk; -p not -A
git commit -m "feat(store): add encrypted device schema"
```

Format is `type(scope): summary` — `feat`, `fix`, `docs`, `chore`, `test`,
`refactor`. It keeps `git log --oneline` readable a year from now.

The pre-commit hook will stop you if a commit contains a credential, a file
over 2MB, or an invariant violation. That is the hook doing its job, not a
bug — read what it says.

## Landing it

```sh
git push -u origin feat/device-store
# open a PR, get CI green, squash-merge
git switch main && git pull
git branch -d feat/device-store
```

**Squash-merge, always.** One commit per change on main. No merge commits,
no tangled graph, and `git log` reads as a list of things that happened.

## Recommended GitHub settings

Set these once on the repo, under Settings → Branches → add a rule for `main`:

- Require a pull request before merging
- Require status checks to pass — select **Invariant gate** and **Typecheck**
- Require linear history
- Allow squash merging only (turn off merge commits and rebase merging)
- Automatically delete head branches after merge

Those five turn the conventions above into things the repository enforces
rather than things people remember.

## If something goes wrong

| Situation | Fix |
|---|---|
| Committed to main by accident, not pushed | `git switch -c feat/x` then `git switch main && git reset --hard origin/main` |
| Wrong commit message, not pushed | `git commit --amend` |
| Want to undo a commit that is already pushed | `git revert <sha>` — never force-push a shared branch |
| Branch has drifted from main | `git switch main && git pull && git switch - && git rebase main` |
| Committed a secret | Rotate the secret first. Removing it from history does not un-leak it. |

The one rule worth internalising: **never force-push a branch anyone else
might have.** Everything else here is recoverable.
