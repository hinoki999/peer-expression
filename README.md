# Peer Expression

Anonymous cohort comparison about your own social behaviour.
The server holds counts; the device holds the personal history.

## Status

Steps 1–6 of the build order. Nothing pending blocks them.
The database binding is **not chosen yet and does not need to be** — the
app runs against the mock adapter, and the binding lands behind
`packages/api-client` when it is decided.

## Quick start

```sh
git config core.hooksPath .githooks   # once per machine — see GIT.md
pnpm install
pnpm check                            # the invariant gate
```

## Layout

```
apps/mobile           RN + Expo. The only thing users touch.
apps/moderation       Internal reviewer tool.
packages/shared       The contract. Imported by everything, imports nothing.
packages/api-client   The only network surface. One adapter, swappable.
services/             Trust path, queue, mill, classifier.
db/                   Server schema, filled at binding time.
tools/                The invariant gate.
```

## The invariant gate

`pnpm check` runs thirty guarantees as structural checks over the source.
It has **no dependencies on purpose**, so a dependency change cannot break
it, and it runs from commit one.

The gate is why the backend decision can arrive late without arriving
expensively: the same checks run against the real binding unchanged, and
tell you in minutes whether it preserved the safety architecture.

`packages/shared/src/invariants/registry.ts` is the index of all thirty.
Rationale lives in project docs 00–21 — this repo does not repeat it.

## Reading order for a new contributor

1. `GIT.md` — how work lands
2. `packages/shared/src/taxonomy/` — the rules everything else obeys
3. `packages/shared/src/contracts/` — the binding seam
4. The schematic — structure and build order
