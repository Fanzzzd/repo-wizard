/**
 * Converts a full path to a relative path based on a root directory.
 * Normalizes path separators to forward slashes ('/').
 * This is a robust, cross-platform way to handle path relativity in the frontend.
 * @param fullPath The absolute path of the file.
 * @param rootPath The absolute path of the root directory.
 * @returns The relative path with forward slashes, or the original fullPath if rootPath is not a parent.
 */
export function getRelativePath(
  fullPath: string,
  rootPath: string | null
): string {
  if (!rootPath) {
    return fullPath.replace(/\\/g, "/");
  }

  // Normalize separators to forward slashes for consistent processing.
  const normalizedFullPath = fullPath.replace(/\\/g, "/");
  let normalizedRootPath = rootPath.replace(/\\/g, "/");

  // Ensure root path ends with a slash to match as a directory.
  if (!normalizedRootPath.endsWith("/")) {
    normalizedRootPath += "/";
  }

  if (normalizedFullPath.startsWith(normalizedRootPath)) {
    return normalizedFullPath.slice(normalizedRootPath.length);
  }

  // Fallback if the path is not inside the root, though this shouldn't typically happen.
  return normalizedFullPath;
}