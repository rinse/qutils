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

/**
 * プロパティベーステスト
 * fast-checkを使用して、様々な入力に対する正確性を検証
 */
describe('Property-Based Tests', () => {
  /**
   * **Feature: quiver-image-generator, Property 12: キャッシュヒットの検出**
   * **Validates: Requirements 5.1**
   * 
   * 任意のURLに対して、対応する画像ファイルが存在する場合、
   * 存在確認は真を返すべきである
   * 
   * より具体的には、キャッシュにURLが存在する場合、getCacheEntryは
   * 対応するエントリを返すべきである
   */
  it('Property 12: キャッシュヒットの検出 - キャッシュに存在するURLは検出される', () => {
    // fast-checkをインポート
    const fc = require('fast-check');
    
    // Base64文字列のジェネレーター（URL-safe Base64）
    const base64Arbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,100}={0,2}$/);
    
    // QuiverのURLジェネレーター
    const quiverUrlArbitrary = base64Arbitrary.map(
      (encodedData: string) => `https://q.uiver.app/#q=${encodedData}`
    );
    
    // ファイルパスジェネレーター
    const filePathArbitrary = fc.tuple(
      fc.stringMatching(/^[a-z0-9-]{1,20}$/),
      fc.stringMatching(/^[a-z0-9-]{1,20}$/),
      fc.stringMatching(/^[a-z0-9-]{1,20}$/)
    ).map(([slug, desc, ext]) => `/path/to/${slug}-${desc}.${ext}`);
    
    // タイムスタンプジェネレーター
    const timestampArbitrary = fc.integer({ min: 0, max: Date.now() });
    
    // CacheEntryジェネレーター
    const cacheEntryArbitrary = fc.tuple(
      quiverUrlArbitrary,
      base64Arbitrary,
      filePathArbitrary,
      timestampArbitrary
    ).map(([url, encodedData, imagePath, timestamp]) => ({
      url,
      encodedData,
      imagePath,
      timestamp,
    }));
    
    // テスト: キャッシュに追加したエントリは必ず取得できる
    fc.assert(
      fc.property(
        fc.array(cacheEntryArbitrary, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (entries: CacheEntry[], targetIndex: number) => {
          // インデックスを配列の範囲内に調整
          const actualIndex = targetIndex % entries.length;
          const targetEntry = entries[actualIndex];
          
          // キャッシュを構築
          let cache: ReadonlyArray<CacheEntry> = [];
          for (const entry of entries) {
            cache = addCacheEntry(cache, entry);
          }
          
          // ターゲットURLでキャッシュエントリを取得
          const result = getCacheEntry(targetEntry.url, cache);
          
          // エントリが見つかることを確認
          expect(result).toBeDefined();
          expect(result?.url).toBe(targetEntry.url);
          expect(result?.encodedData).toBe(targetEntry.encodedData);
          expect(result?.imagePath).toBe(targetEntry.imagePath);
          expect(result?.timestamp).toBe(targetEntry.timestamp);
        }
      ),
      { numRuns: 100 } // 最低100回の反復を実行
    );
  });

  /**
   * **Feature: quiver-image-generator, Property 13: 同一URLのスキップ**
   * **Validates: Requirements 5.2**
   * 
   * 任意のURLに対して、同じURLで2回処理を実行した場合、
   * 2回目は画像生成をスキップするべきである
   * 
   * より具体的には、URLとencodedDataが同じ場合、hasUrlChangedはfalseを返し、
   * キャッシュヒットが発生するべきである
   */
  it('Property 13: 同一URLのスキップ - 同じURLで2回処理した場合、2回目はスキップされる', () => {
    // fast-checkをインポート
    const fc = require('fast-check');
    
    // Base64文字列のジェネレーター（URL-safe Base64）
    const base64Arbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,100}={0,2}$/);
    
    // QuiverのURLジェネレーター
    const quiverUrlArbitrary = base64Arbitrary.map(
      (encodedData: string) => `https://q.uiver.app/#q=${encodedData}`
    );
    
    // ファイルパスジェネレーター
    const filePathArbitrary = fc.tuple(
      fc.stringMatching(/^[a-z0-9-]{1,20}$/),
      fc.stringMatching(/^[a-z0-9-]{1,20}$/),
      fc.stringMatching(/^[a-z0-9-]{1,20}$/)
    ).map(([slug, desc, ext]) => `/path/to/${slug}-${desc}.${ext}`);
    
    // タイムスタンプジェネレーター
    const timestampArbitrary = fc.integer({ min: 0, max: Date.now() });
    
    // テスト: 同じURLとencodedDataで2回処理した場合、2回目はhasUrlChangedがfalseを返す
    fc.assert(
      fc.property(
        quiverUrlArbitrary,
        base64Arbitrary,
        filePathArbitrary,
        timestampArbitrary,
        (url: string, encodedData: string, imagePath: string, timestamp: number) => {
          // 1回目の処理: キャッシュにエントリを追加
          const initialCache: ReadonlyArray<CacheEntry> = [];
          const entry: CacheEntry = {
            url,
            encodedData,
            imagePath,
            timestamp,
          };
          const cacheAfterFirst = addCacheEntry(initialCache, entry);
          
          // 2回目の処理: 同じURLとencodedDataで確認
          const urlChanged = hasUrlChanged(url, encodedData, cacheAfterFirst);
          
          // 2回目はURLが変更されていないと判定されるべき
          expect(urlChanged).toBe(false);
          
          // キャッシュエントリも取得できるべき
          const cachedEntry = getCacheEntry(url, cacheAfterFirst);
          expect(cachedEntry).toBeDefined();
          expect(cachedEntry?.url).toBe(url);
          expect(cachedEntry?.encodedData).toBe(encodedData);
        }
      ),
      { numRuns: 100 } // 最低100回の反復を実行
    );
  });
});
