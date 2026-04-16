/**
 * Site pot debit for a user message. Tunable multiplier for future LLM / pricing changes.
 * Word count = whitespace-separated tokens after trim.
 */
const SITE_POT_WORD_MULTIPLIER = 1.3;

export function sitePotCostFromMessage(message: string): number {
  const trimmed = message.trim();
  if (!trimmed) return 0;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * SITE_POT_WORD_MULTIPLIER);
}
