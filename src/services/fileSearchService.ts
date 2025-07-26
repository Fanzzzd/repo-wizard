import { invoke } from '@tauri-apps/api/core';

export interface SearchResult {
  path: string;
  relativePath: string;
  name: string;
  parentDir: string;
  score: number;
  isDirectory: boolean;
}

export interface IgnoreSettings {
  respectGitignore: boolean;
  customIgnorePatterns: string;
}

export class FileSearchService {
  private static instance: FileSearchService;
  private searchCache = new Map<string, SearchResult[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5000; // 5 seconds

  static getInstance(): FileSearchService {
    if (!FileSearchService.instance) {
      FileSearchService.instance = new FileSearchService();
    }
    return FileSearchService.instance;
  }

  private getCacheKey(query: string, rootPath: string): string {
    return `${rootPath}:${query}`;
  }

  private isValidCache(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  async searchFiles(
    query: string,
    rootPath: string,
    settings: IgnoreSettings,
    limit: number = 100
  ): Promise<SearchResult[]> {
    // Return empty results for empty queries
    if (!query.trim()) {
      return [];
    }

    const cacheKey = this.getCacheKey(query, rootPath);

    // Check cache first
    if (this.isValidCache(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const results = await invoke<SearchResult[]>('search_files', {
        query: query.trim(),
        rootPath,
        settings,
        limit,
      });

      // Cache the results
      this.searchCache.set(cacheKey, results);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return results;
    } catch (error) {
      console.error('File search error:', error);
      return [];
    }
  }

  clearCache(): void {
    this.searchCache.clear();
    this.cacheExpiry.clear();
  }

  // Debounced search function
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  searchFilesDebounced(
    query: string,
    rootPath: string,
    settings: IgnoreSettings,
    callback: (results: SearchResult[]) => void,
    delay: number = 150
  ): void {
    const debounceKey = `${rootPath}:${query}`;

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      const results = await this.searchFiles(query, rootPath, settings);
      callback(results);
      this.debounceTimers.delete(debounceKey);
    }, delay);

    this.debounceTimers.set(debounceKey, timer);
  }
}

export const fileSearchService = FileSearchService.getInstance();
