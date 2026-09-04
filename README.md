# Word Chain

A daily word-ladder puzzle. Seven words stack vertically; the top and bottom are
given and you fill in the five between them, so that every neighbouring pair —
read downward — forms a compound word or a common two-word phrase.

```
HAND
BOOK     hand book · book mark
MARK     mark up
UP       up beat
BEAT     beat box
BOX      box car
CAR
```

Wrong guesses buy you letters: each miss locks in one more starting letter of
that rung, and locked letters are never retyped — you only ever type what's
still missing.

## Status

Playable, backed by a hand-authored bank of 30 chains and browser-local stats.
The backend that makes cross-player rankings possible has not landed yet — see
[Roadmap](#roadmap).

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 90 unit tests
npm run typecheck
npm run build
npm run smoke      # browser end-to-end run; needs `npm run build` first
```

`npm run smoke` drives a real Chromium through a full solve. It picks up a
browser from `PLAYWRIGHT_BROWSERS_PATH`, or set `PLAYWRIGHT_CHROMIUM` to a binary
directly. If you have neither, `npx playwright install chromium` first.

### Dev-only URL overrides

Reviewing the puzzle bank would otherwise take a day per chain:

| Query | Effect |
|---|---|
| `?date=2026-03-14` | play that day's chain |
| `?puzzle=7` | jump to bank index 7 |
| `?reset=1` | clear stored stats |

All three are inert outside `vite dev`, so a deployed URL cannot be steered by a
query string — which matters once scores are ranked.

## How it is put together

```
src/engine/    game rules, scoring — pure functions, no React, no DOM
src/lib/       daily rollover, local stats, share text, branding
src/data/      the starter puzzle bank
src/ui/        React components
scripts/       browser smoke test
```

### The split that matters

`engine.ts` separates deciding a guess from applying it:

- **`adjudicate(puzzle, state, row, guess)`** is the only function that needs the
  answers. It returns a `GuessOutcome`.
- **`applyGuess(state, outcome)`** advances the board and needs no answers at all.

When the backend lands, `adjudicate` moves into a server function unchanged and
the browser keeps calling `applyGuess` with whatever comes back. The client stops
holding the chain, which is what makes a leaderboard worth trusting. `PuzzleView`
already models the redacted shape a client is allowed to have — `toPuzzleView`
produces it, and a unit test asserts no answer survives the redaction.

### Rules

- Each wrong guess locks one more leading letter of that rung. The final letter is
  never given away.
- **Locked letters are never retyped.** The input holds only the letters still
  owed, which is also why backspace cannot reach into the clue.
- While a rung has no locked letters, a guess that solves a different open rung
  counts too, and focus stays where you were working. Once a rung has a clue the
  guess is prefix-bound, so you tap the rung you mean instead.
- Repeating a guess already tried on a rung costs nothing and reveals nothing. In
  practice this only bites once the clue stops growing, since a repeated suffix
  composes to a different word each time the prefix grows.

### Scoring

| | |
|---|---|
| Base | 1,000 |
| Wrong guess | −25 each |
| Locked letter | −60 each |
| Time bonus | up to +300, decaying 1 point per 2 seconds |

Penalties floor at zero before the bonus is added, so a disastrous solve still
rewards finishing. The bonus is capped so speed alone cannot beat accuracy — a
leaderboard needs to rank skill, not reflexes.

### Daily rollover

One global reset at midnight `America/New_York`, so the whole field plays the
same puzzle at the same time. That is what makes a daily percentile mean
anything. `src/lib/dates.ts` derives everything from `Intl`, and is tested across
both daylight-saving transitions.

## Deploying

Cloudflare Pages:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | *(blank)* |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | from `.node-version` (20) |

To move to a custom domain: add it under Pages → Custom domains, then change
`SITE_ORIGIN` in `src/lib/brand.ts`. Nothing else in the codebase knows the
hostname.

## Roadmap

- **P1** — Supabase: anonymous sessions, server-authoritative guessing, results,
  and the global percentile ("you beat 87% of solvers today").
- **P2** — a puzzle generator built from open compound-word corpora, with a
  review step, replacing `src/data/seedPuzzles.ts`.
- **P3** — accounts, a first-sign-in privacy screen, streaks, country boards,
  and the share card.
- **Later** — private friend groups.
