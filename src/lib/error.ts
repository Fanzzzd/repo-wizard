export class AppError extends Error {
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "AppError";
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
  // The error from Tauri is often a string. For AppError, check the original error.
  const errorMessage = String(
    error instanceof AppError ? error.originalError : error
  ).toLowerCase();
  return (
    errorMessage.includes("no such file or directory") ||
    errorMessage.includes("the system cannot find the file specified")
  );
}