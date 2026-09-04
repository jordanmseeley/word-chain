/**
 * End-to-end smoke test against the built app.
 *
 * Covers what unit tests cannot: real DOM focus movement, clue reveals, the
 * result card, persistence across a reload, and a clean browser console.
 *
 *   npm run build && npm run smoke
 *
 * Set PLAYWRIGHT_CHROMIUM to point at a specific browser binary.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { puzzleForDate } from '../src/data/puzzleBank';
import { puzzleDateAt } from '../src/lib/dates';

const PORT = process.env.SMOKE_PORT ?? '4318';
const URL = `http://localhost:${PORT}/`;

const puzzle = puzzleForDate(puzzleDateAt());
const top = puzzle.chain[0]!;
const bottom = puzzle.chain[6]!;
const answers = puzzle.chain.slice(1, 6);

function findChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root) return undefined;
  // Playwright caches browsers in versioned directories (chromium-1194, ...).
  for (const dir of ['chromium', 'chromium-1194']) {
    const candidate = `${root}/${dir}/chrome-linux/chrome`;
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server never came up at ${url} — did you run \`npm run build\`?`);
}

let server: ChildProcess;
let browser: Browser;
let page: Page;
const consoleErrors: string[] = [];

const squash = (value: string): string => value.replace(/\s+/g, ' ').trim();
const text = (selector: string): Promise<string> => page.locator(selector).innerText().then(squash);

/**
 * Type into the focused rung. The field holds only the letters the player still
 * owes, so callers pass the suffix — mirroring what a real player types.
 */
async function type(suffix: string): Promise<void> {
  await page.locator('#guess').fill(suffix);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
}

/** Index of the rung that currently has focus. */
async function focusedIndex(): Promise<number> {
  return Number(await page.locator('.rung--focused').getAttribute('data-row'));
}

/** A suffix of the given length that cannot accidentally be the right answer. */
function wrongSuffix(length: number): string {
  const filler = answers.some((a) => a.endsWith('z')) ? 'q' : 'z';
  return filler.repeat(Math.max(1, length));
}

/** Letters currently shown in the focused rung's tiles, locked ones included. */
async function tiles(): Promise<{ locked: string; total: number }> {
  const all = page.locator('.rung--focused .tile');
  const locked = page.locator('.rung--focused .tile--locked');
  return {
    locked: (await locked.allInnerTexts()).join('').toLowerCase(),
    total: await all.count(),
  };
}

beforeAll(async () => {
  server = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], { stdio: 'ignore' });
  await waitForServer(URL);

  const executablePath = findChromium();
  browser = await chromium.launch(executablePath ? { executablePath } : {});
  page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
}, 90_000);

afterAll(async () => {
  await browser?.close();
  server?.kill();
});

describe(`daily puzzle #${puzzle.number}`, () => {
  it('shows the two given words and hides the rest', async () => {
    expect(await text('.rung--given >> nth=0')).toBe(top.toUpperCase());
    expect(await text('.rung--given >> nth=1')).toBe(bottom.toUpperCase());
    expect(await page.locator('.rung--solved').count()).toBe(0);
  });

  it('shows one tile per letter, none locked before a clue is earned', async () => {
    expect(await tiles()).toEqual({ locked: '', total: answers[0]!.length });
  });

  it('credits a rung solved out of order while the current rung has no clue', async () => {
    // Nothing is locked yet, so the typed word stands alone and can match any rung.
    await type(answers[3]!);
    expect(await text('.rung--solved')).toBe(answers[3]!.toUpperCase());
    // Focus stays on the rung the player was working.
    expect(await focusedIndex()).toBe(0);
    expect(await text('.counters')).toBe('1/5 solved 0 misses');
  });

  it('charges a miss and locks one letter for a wrong guess', async () => {
    await type(wrongSuffix(answers[0]!.length));
    expect(await tiles()).toEqual({ locked: answers[0]![0]!, total: answers[0]!.length });
    expect(await text('.counters')).toBe('1/5 solved 1 miss');
  });

  it('will not let backspace delete a locked letter', async () => {
    const input = page.locator('#guess');
    await input.focus();
    for (let i = 0; i < 10; i += 1) await page.keyboard.press('Backspace');
    // The field only ever holds the suffix, so the clue is physically out of reach.
    expect(await input.inputValue()).toBe('');
    expect((await tiles()).locked).toBe(answers[0]![0]!);
  });

  it('refuses to score a submit with nothing typed', async () => {
    await page.locator('#guess').fill('');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await text('.toast')).toBe('Finish the word first');
    expect(await text('.counters')).toBe('1/5 solved 1 miss');
  });

  it('stops revealing one letter short, then charges nothing for a repeat', async () => {
    // Miss until the clue stops growing; it must never give up the last letter.
    const answer = answers[0]!;
    for (let i = 0; i < answer.length + 2; i += 1) {
      const remaining = answer.length - (await tiles()).locked.length;
      if (remaining <= 1) break;
      await type(wrongSuffix(remaining));
    }
    expect((await tiles()).locked).toBe(answer.slice(0, answer.length - 1));

    // With the clue capped, the same typed letter composes the same word twice.
    const missesBefore = await text('.counters');
    await type(wrongSuffix(1));
    await type(wrongSuffix(1));
    expect(await text('.toast')).toBe('Already tried on this rung');
    expect(await text('.counters')).not.toBe(missesBefore);
  });

  it('completes the chain and scores it', async () => {
    // Type only the letters still owed on whichever rung has focus.
    for (let guard = 0; guard < 20; guard += 1) {
      if ((await page.locator('#guess').count()) === 0) break;
      const index = await focusedIndex();
      const locked = (await tiles()).locked;
      await type(answers[index]!.slice(locked.length));
    }

    await page.waitForSelector('.result', { timeout: 5_000 });
    expect(await page.locator('.rung--solved').count()).toBe(5);
    const score = Number((await text('.result .score')).replace(/[^0-9]/g, ''));
    expect(score).toBeGreaterThanOrEqual(0);
    // The full chain is only revealed once the puzzle is over.
    expect(await text('.chain-reveal')).toBe(puzzle.chain.join(' · ').toUpperCase());
  });

  it('records the result and keeps it across a reload', async () => {
    await page.locator('button[aria-label="Your stats"]').click();
    await page.waitForSelector('.modal');
    // This run took misses, so it is played but not perfect.
    expect(await text('.stat-grid >> nth=0')).toBe('1 PLAYED 0 PERFECT 1 STREAK 1 BEST');

    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('button[aria-label="Your stats"]').click();
    await page.waitForSelector('.modal');
    // Still 1 played: a finished day must not be scored twice.
    expect(await text('.stat-grid >> nth=0')).toBe('1 PLAYED 0 PERFECT 1 STREAK 1 BEST');
  });

  it('logs nothing to the console', () => {
    expect(consoleErrors).toEqual([]);
  });
});
