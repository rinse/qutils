/**
 * キャッシュ管理機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  getCacheEntry,
  addCacheEntry,
  hasUrlChanged,
  loadCache,
  saveCache,
} from './cache';
import { CacheEntry } from './types';

describe('getCacheEntry', () => {
  it('should return the cache entry for a matching URL', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
      {
        url: 'https://q.uiver.app/#q=def',
        encodedData: 'def',
        imagePath: '/path/to/image2.svg',
        timestamp: 2000,
      },
    ];

    const result = getCacheEntry('https://q.uiver.app/#q=abc', cache);

    expect(result).toEqual({
      url: 'https://q.uiver.app/#q=abc',
      encodedData: 'abc',
      imagePath: '/path/to/image1.svg',
      timestamp: 1000,
    });
  });

  it('should return undefined for a non-matching URL', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];

    const result = getCacheEntry('https://q.uiver.app/#q=xyz', cache);

    expect(result).toBeUndefined();
  });

  it('should return undefined for an empty cache', () => {
    const cache: ReadonlyArray<CacheEntry> = [];

    const result = getCacheEntry('https://q.uiver.app/#q=abc', cache);

    expect(result).toBeUndefined();
  });
});

describe('addCacheEntry', () => {
  it('should add a new entry to an empty cache', () => {
    const cache: ReadonlyArray<CacheEntry> = [];
    const newEntry: CacheEntry = {
      url: 'https://q.uiver.app/#q=abc',
      encodedData: 'abc',
      imagePath: '/path/to/image.svg',
      timestamp: 1000,
    };

    const result = addCacheEntry(cache, newEntry);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newEntry);
  });

  it('should add a new entry to an existing cache', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];
    const newEntry: CacheEntry = {
      url: 'https://q.uiver.app/#q=def',
      encodedData: 'def',
      imagePath: '/path/to/image2.svg',
      timestamp: 2000,
    };

    const result = addCacheEntry(cache, newEntry);

    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(newEntry);
  });

  it('should replace an existing entry with the same URL', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];
    const updatedEntry: CacheEntry = {
      url: 'https://q.uiver.app/#q=abc',
      encodedData: 'xyz',
      imagePath: '/path/to/image2.svg',
      timestamp: 2000,
    };

    const result = addCacheEntry(cache, updatedEntry);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(updatedEntry);
  });

  it('should not mutate the original cache', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];
    const newEntry: CacheEntry = {
      url: 'https://q.uiver.app/#q=def',
      encodedData: 'def',
      imagePath: '/path/to/image2.svg',
      timestamp: 2000,
    };

    const result = addCacheEntry(cache, newEntry);

    expect(cache).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});

describe('hasUrlChanged', () => {
  it('should return true for a new URL not in cache', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];

    const result = hasUrlChanged(
      'https://q.uiver.app/#q=def',
      'def',
      cache
    );

    expect(result).toBe(true);
  });

  it('should return false when URL exists with same encoded data', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];

    const result = hasUrlChanged(
      'https://q.uiver.app/#q=abc',
      'abc',
      cache
    );

    expect(result).toBe(false);
  });

  it('should return true when URL exists but encoded data changed', () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
    ];

    const result = hasUrlChanged(
      'https://q.uiver.app/#q=abc',
      'xyz',
      cache
    );

    expect(result).toBe(true);
  });

  it('should return true for an empty cache', () => {
    const cache: ReadonlyArray<CacheEntry> = [];

    const result = hasUrlChanged(
      'https://q.uiver.app/#q=abc',
      'abc',
      cache
    );

    expect(result).toBe(true);
  });
});

describe('loadCache and saveCache', () => {
  let tempDir: string;
  let cacheFilePath: string;

  beforeEach(async () => {
    // 一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
    cacheFilePath = path.join(tempDir, 'cache.json');
  });

  afterEach(async () => {
    // 一時ディレクトリを削除
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should save and load cache correctly', async () => {
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image1.svg',
        timestamp: 1000,
      },
      {
        url: 'https://q.uiver.app/#q=def',
        encodedData: 'def',
        imagePath: '/path/to/image2.svg',
        timestamp: 2000,
      },
    ];

    await saveCache(cacheFilePath, cache);
    const loaded = await loadCache(cacheFilePath);

    expect(loaded).toEqual(cache);
  });

  it('should return empty array when cache file does not exist', async () => {
    const nonExistentPath = path.join(tempDir, 'non-existent.json');
    const loaded = await loadCache(nonExistentPath);

    expect(loaded).toEqual([]);
  });

  it('should return empty array when cache file contains invalid JSON', async () => {
    await fs.writeFile(cacheFilePath, 'invalid json', 'utf-8');
    const loaded = await loadCache(cacheFilePath);

    expect(loaded).toEqual([]);
  });

  it('should return empty array when cache file contains non-array data', async () => {
    await fs.writeFile(cacheFilePath, '{"key": "value"}', 'utf-8');
    const loaded = await loadCache(cacheFilePath);

    expect(loaded).toEqual([]);
  });

  it('should create directory if it does not exist', async () => {
    const nestedPath = path.join(tempDir, 'nested', 'dir', 'cache.json');
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: 'https://q.uiver.app/#q=abc',
        encodedData: 'abc',
        imagePath: '/path/to/image.svg',
        timestamp: 1000,
      },
    ];

    await saveCache(nestedPath, cache);
    const loaded = await loadCache(nestedPath);

    expect(loaded).toEqual(cache);
  });
});
