import * as vscode from 'vscode';
import * as crypto from 'crypto';

interface CacheEntry {
  translation: string;
  timestamp: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private globalState: vscode.Memento | null = null;
  private readonly STORAGE_KEY = 'problemTranslator.cache';

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  initialize(globalState: vscode.Memento): void {
    this.globalState = globalState;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (!this.globalState) {
      return;
    }

    const stored = this.globalState.get<Record<string, CacheEntry>>(this.STORAGE_KEY, {});
    this.memoryCache = new Map(Object.entries(stored));
    this.stats.size = this.memoryCache.size;
  }

  private async saveToStorage(): Promise<void> {
    if (!this.globalState) {
      return;
    }

    const entries: Record<string, CacheEntry> = {};
    this.memoryCache.forEach((value, key) => {
      entries[key] = value;
    });

    await this.globalState.update(this.STORAGE_KEY, entries);
  }

  private generateKey(message: string): string {
    return crypto.createHash('md5').update(message).digest('hex');
  }

  get(message: string): string | undefined {
    const key = this.generateKey(message);
    const entry = this.memoryCache.get(key);

    if (entry) {
      this.stats.hits++;
      // Move to end for LRU
      this.memoryCache.delete(key);
      this.memoryCache.set(key, entry);
      return entry.translation;
    }

    this.stats.misses++;
    return undefined;
  }

  async set(message: string, translation: string): Promise<void> {
    const key = this.generateKey(message);

    // LRU eviction if at capacity
    if (this.memoryCache.size >= this.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, {
      translation,
      timestamp: Date.now(),
    });

    this.stats.size = this.memoryCache.size;
    await this.saveToStorage();
  }

  has(message: string): boolean {
    const key = this.generateKey(message);
    return this.memoryCache.has(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
    await this.saveToStorage();
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) {
      return 0;
    }
    return (this.stats.hits / total) * 100;
  }

  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;

    // Evict if necessary
    while (this.memoryCache.size > this.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.stats.size = this.memoryCache.size;
  }
}
