export class AppError extends Error {
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'AppError';
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Checks if an error indicates that a file was not found.
 * @param error The error object.
 * @returns `true` if the error is a file-not-found error, otherwise `false`.
 */
export function isFileNotFoundError(error: unknown): boolean {
  if (!error) return false;
  // The error from Tauri is often a string. For AppError, check original error first,
  // then fall back to the message if no original error is present.
  const rawMessage =
    error instanceof AppError ? (error.originalError ?? error.message) : error;
  const errorMessage = String(rawMessage).toLowerCase();
  return (
    errorMessage.includes('no such file or directory') ||
    errorMessage.includes('the system cannot find the file specified') ||
    errorMessage.includes('cannot find the file specified') ||
    errorMessage.includes('file not found')
  );
}
