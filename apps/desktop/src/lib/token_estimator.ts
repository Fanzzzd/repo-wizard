import { countTokens } from '../services/tauriApi';

/**
 * Counts the number of tokens in a given text using the Rust tokenizer.
 * @param text The input string.
 * @returns A promise of the token count.
 */
export const estimateTokens = async (text: string): Promise<number> => {
  if (!text) return 0;
  return countTokens(text);
};

/**
 * Formats a token count for display, using 'k' for thousands.
 * @param tokens The number of tokens.
 * @returns A formatted string.
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens < 1000) {
    return tokens.toLocaleString();
  }
  const thousands = tokens / 1000;
  return `${parseFloat(thousands.toFixed(1))}k`;
};
