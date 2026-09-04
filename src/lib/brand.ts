/**
 * Everything that knows where this game lives.
 *
 * Kept in one file so moving to a custom domain is a single-line change: no
 * other module should hardcode a hostname.
 */
export const SITE_NAME = 'Word Chain';

/** Shown on the share card. Update this when the custom domain goes live. */
export const SITE_ORIGIN = 'word-chain.pages.dev';

export const SITE_URL = `https://${SITE_ORIGIN}`;

export const REPO_URL = 'https://github.com/jordanmseeley/word-chain';
