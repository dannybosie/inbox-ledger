import type { Rule } from './types';
import { normalizeText } from './util';
import { UNCATEGORIZED } from './text';

/**
 * Picks a category from the rule list; the first rule that matches wins. Rules missing a keyword or category are skipped.
 * Matching ignores case and Vietnamese accents: "phuc long" matches "PHÚC LONG COFFEE".
 */
export function categorize(description: string, rules: Rule[]): string {
  const text = normalizeText(description);
  for (const rule of rules) {
    const keyword = normalizeText(rule.keyword);
    if (keyword && rule.category && text.indexOf(keyword) !== -1) return rule.category;
  }
  return UNCATEGORIZED;
}
