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
