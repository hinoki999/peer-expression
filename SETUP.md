# First-time setup (Windows / PowerShell)

Run these in order. After each step there's a **check** — if what you see
doesn't match, stop there rather than continuing.

---

## Before anything: confirm two things with Atlas

1. **Which account owns the repo** — his personal account, or a HiRule org?
   If an org exists, the repo belongs there, not on a personal account.
   Repos are painful to move once other people have cloned them.
2. **The repo name.** `peer-expression` is the placeholder. D2 (the product
   name) is still open, but the *repo* name is cheap to change later — only
   the iOS bundle identifier is expensive, and that isn't set until first
   submission.

---

## 1. Unpack

```powershell
cd ~\Projects              # or wherever you keep code
tar -xzf ~\Downloads\peer-expression-repo.tar.gz
cd peer-expression
```

**Check:**
```powershell
git log --oneline
```
You should see exactly three commits, newest first:
```
b1411ab chore: force LF on hooks and scripts
bb2c62b docs: add the four spike briefs
480f14e chore: scaffold monorepo with the invariant gate
```

---

## 2. Confirm no remote is set

```powershell
git remote -v
```

**Check:** this prints **nothing**. That's correct — there is nowhere to
push yet, so nothing can go to the wrong place.

---

## 3. Set who the commits are from

This is repo-local, so it won't affect any other project on your machine.

```powershell
git config user.name "Caitie"
git config user.email "ganon@hirulelabs.com"
```

**Check:**
```powershell
git config user.email
```

> **Worth knowing:** the commit author and the pushing account are two
> different things. You'll push using Atlas's credentials, but each commit
> stays authored by whatever's set above. That's the honest record — your
> work, pushed through his access. If he'd rather the commits carry his
> identity, set it here instead, and tell me so I can rewrite the three
> existing ones before they're shared.

---

## 4. Turn the hooks on

They're inert until you do this — git doesn't run hooks from a tracked
directory by default.

```powershell
git config core.hooksPath .githooks
```

**Check that they actually run on Windows:**
```powershell
echo "test" > scratch.txt
git add scratch.txt
git commit -m "test"
```

You should see the **Invariant gate** output and seven PASS lines, then the
commit succeeds. Then undo it:

```powershell
git reset --hard HEAD~1
```

**If instead you see `bad interpreter` or `^M`:** the line endings got
converted. Fix with:
```powershell
git config core.autocrlf false
git rm --cached -r .
git reset --hard
```

**If you see `node: command not found`:** install Node 22 from nodejs.org,
reopen PowerShell, try again. The hook runs the invariant gate and needs it.

---

## 5. Check which GitHub account is cached

You've signed in as Atlas before, so Windows has a token stored. Confirm
it's the right one *before* you push, not after.

```powershell
cmdkey /list | Select-String "github"
```

To see or change it: **Start → Credential Manager → Windows Credentials**,
look for `git:https://github.com`. If it's the wrong account, remove that
entry — git will prompt you to sign in on the next push.

---

## 6. Create the empty repo on GitHub

In a browser, signed in as the account from step 5:

- **New repository**
- Name: `peer-expression` (or whatever Atlas decided)
- **Private**
- **Do not** add a README, .gitignore, or licence

That last one matters. Initialising with any file creates a commit on
GitHub's side, and your push will then be rejected as unrelated history.
An empty repo accepts your history cleanly.

**Check:** the page after creation says *"Quick setup"* and shows a URL. Copy it.

---

## 7. Point the repo at it

```powershell
git remote add origin https://github.com/<account>/<repo>.git
```

**Check — read this back before pushing:**
```powershell
git remote -v
```
Confirm the account and repo name are exactly right. This is the last
moment before anything leaves your machine.

---

## 8. Push

```powershell
git push -u origin main
```

**Check:** GitHub shows three commits and the file tree. The README renders
on the front page.

> **If it says `BLOCKED: direct push to main`** — that's the pre-push hook
> working, but it shouldn't fire on the very first push of an empty repo.
> Use `git push --no-verify -u origin main` once, for this push only. Every
> push after this goes through a branch.

---

## 9. Turn on branch protection

**Settings → Branches → Add branch protection rule**, pattern `main`:

- Require a pull request before merging
- Require status checks to pass → select **Invariant gate** and **Typecheck**
  *(these only appear after CI has run once — come back after your first PR)*
- Require linear history

**Settings → General → Pull Requests:**

- Allow squash merging — **on**
- Allow merge commits — **off**
- Allow rebase merging — **off**
- Automatically delete head branches — **on**

Those six settings turn the conventions in `GIT.md` into things the
repository enforces rather than things people remember.

---

## 10. Push the spike branches

```powershell
git push origin spike/emoji-fidelity
git push origin spike/reveal-60fps
git push origin spike/share-export
git push origin spike/age-band-testflight
```

**Check:** GitHub's branch dropdown shows `main` plus four spikes.

---

## Done

From here, all work goes through a branch — see `GIT.md`. The everyday loop:

```powershell
git switch main
git pull
git switch -c feat/what-youre-doing
# ... work, commit ...
git push -u origin feat/what-youre-doing
# open a PR, CI goes green, squash-merge
```
