import type { ReactNode } from 'react';

// Only http(s) becomes a link. Anything else — javascript:, data:, file: — is
// left as plain text, so user-entered content can never produce a live anchor
// with an executable scheme.
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

const SENTENCE_PUNCTUATION = '.,;:!?';

function countOccurrences(text: string, char: string): number {
  let count = 0;
  for (const c of text) {
    if (c === char) count++;
  }
  return count;
}

/**
 * Split trailing characters that belong to the surrounding sentence rather than
 * the URL — "see https://example.com." or "(https://example.com)". A closing
 * paren is kept when the URL opened one itself, e.g. /wiki/Foo_(bar).
 */
function splitTrailing(raw: string): { href: string; trailing: string } {
  let href = raw;
  let trailing = '';

  for (;;) {
    const last = href[href.length - 1];
    if (!last) break;

    if (SENTENCE_PUNCTUATION.includes(last)) {
      trailing = last + trailing;
      href = href.slice(0, -1);
      continue;
    }

    if (last === ')' && countOccurrences(href, ')') > countOccurrences(href, '(')) {
      trailing = last + trailing;
      href = href.slice(0, -1);
      continue;
    }

    break;
  }

  return { href, trailing };
}

/**
 * Turn bare URLs in plain text into anchor elements, returning React nodes.
 * Building nodes (rather than an HTML string) keeps this XSS-safe by
 * construction — surrounding text is always rendered as text.
 */
export function linkify(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    const { href, trailing } = splitTrailing(match[0]);

    // A match that is nothing but punctuation after trimming isn't a link.
    if (!href || href === 'http://' || href === 'https://') continue;

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <a
        key={`link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="underline break-all"
        style={{ color: 'var(--color-ink)', textUnderlineOffset: 2 }}
      >
        {href}
      </a>
    );

    if (trailing) nodes.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
