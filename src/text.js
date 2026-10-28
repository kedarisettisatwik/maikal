import { decodeHTML } from 'entities';

// Feed descriptions can be HTML-encoded more than once. Return text, never render HTML.
export function plainText(value) {
  let result = typeof value === 'string' ? value : '';
  for (let pass = 0; pass < 4; pass++) {
    const previous = result;
    result = decodeHTML(result)
      .replace(/<!--[^]*?-->/g, ' ')
      .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
      .replace(/<\/?[a-z][^>]*(?:>|$)/gi, ' ');
    if (result === previous) break;
  }
  return result.replace(/\s+/g, ' ').trim();
}
