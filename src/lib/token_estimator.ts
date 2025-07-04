/**
 * Estimates the number of tokens in a given text.
 * A common approximation is that 1 token is about 4 characters.
 * @param text The input string.
 * @returns The estimated number of tokens.
 */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};