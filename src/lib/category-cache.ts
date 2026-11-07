import type { DummyJsonProduct } from '@/types/products';

export interface CategoryCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

interface CacheEntry {
  products: DummyJsonProduct[];
  timestamp: number;
  lastAccessed: number;
}

/**
 * Bounded in-memory Least Recently Used (LRU) cache with time-to-live (TTL) expiration.
 * Used to cache category products for client-side search filtering without exceeding memory limits.
 */
export class CategoryCache {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: CategoryCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60000; // 60 seconds default
    this.maxEntries = options.maxEntries ?? 20; // Bound to max 20 categories
  }

  /**
   * Normalizes category identifiers to ensure case-insensitive, whitespace-agnostic lookups.
   */
  public normalizeKey(category: string): string {
    return category.trim().toLowerCase();
  }

  /**
   * Retrieves products for a category if present and not expired.
   * Refreshes LRU order on access.
   */
  public get(category: string, currentTime: number = Date.now()): DummyJsonProduct[] | null {
    const key = this.normalizeKey(category);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTL expiration check
    if (currentTime - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU position by re-inserting
    this.cache.delete(key);
    entry.lastAccessed = currentTime;
    this.cache.set(key, entry);

    return [...entry.products];
  }

  /**
   * Stores category products in cache, evicting the least recently used entry if at capacity.
   */
  public set(
    category: string,
    products: DummyJsonProduct[],
    currentTime: number = Date.now()
  ): void {
    const key = this.normalizeKey(category);

    // Actively remove expired entries to free capacity
    this.prune(currentTime);

    // If key already exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict Least Recently Used entry (first key inserted)
      let oldestKey: string | null = null;
      this.cache.forEach((_, k) => {
        if (!oldestKey) oldestKey = k;
      });
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      products: [...products],
      timestamp: currentTime,
      lastAccessed: currentTime,
    });
  }

  /**
   * Removes all expired entries from cache.
   */
  public prune(currentTime: number = Date.now()): void {
    this.cache.forEach((entry, key) => {
      if (currentTime - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Clears all cached categories.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Returns current active entry count.
   */
  public size(): number {
    return this.cache.size;
  }
}

// Global bounded singleton for application runtime
export const categoryProductsCache = new CategoryCache({
  ttlMs: 60000,
  maxEntries: 20,
});
