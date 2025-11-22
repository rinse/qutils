/**
 * URL処理機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { processSingleUrl } from './process-url';
import type { QuiverUrl, CacheEntry } from './types';

// SVG生成をモック
vi.mock('./svg-generator', () => ({
  generateSvg: vi.fn(async () => '<svg><rect width="100" height="100"/></svg>'),
}));

describe('processSingleUrl', () => {
  const testDir = path.join(process.cwd(), 'test-output');
  const imagesDir = path.join(testDir, 'images');
  
  beforeEach(async () => {
    // テスト用ディレクトリを作成
    await fs.mkdir(imagesDir, { recursive: true });
  });
  
  afterEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it('should generate SVG for new URL', async () => {
    // 有効なQuiverのURLとデータ
    const encodedData = Buffer.from(JSON.stringify([
      [[0, 0, 'A'], [1, 0, 'B']],
      [[0, 1, 'f']],
    ])).toString('base64');
    
    const quiverUrl: QuiverUrl = {
      url: `https://q.uiver.app/#q=${encodedData}`,
      encodedData,
      position: { start: 0, end: 100 },
    };
    
    const config = {
      strategy: 'browser' as const,
      input: quiverUrl.url,
    };
    
    const cache: ReadonlyArray<CacheEntry> = [];
    const markdownDir = testDir;
    
    const result = await processSingleUrl(
      quiverUrl,
      config,
      'test-article',
      cache,
      imagesDir,
      markdownDir,
    );
    
    // 結果の検証
    expect(result.shouldReplace).toBe(true);
    expect(result.imagePath).toMatch(/.*\.svg$/);
    
    // ファイルが実際に作成されたか確認
    const fullPath = path.join(imagesDir, path.basename(result.imagePath));
    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
  
  it('should skip generation for cached URL with existing file', async () => {
    // 有効なQuiverのURLとデータ
    const encodedData = Buffer.from(JSON.stringify([
      [[0, 0, 'A'], [1, 0, 'B']],
      [[0, 1, 'f']],
    ])).toString('base64');
    
    const quiverUrl: QuiverUrl = {
      url: `https://q.uiver.app/#q=${encodedData}`,
      encodedData,
      position: { start: 0, end: 100 },
    };
    
    // 既存のファイルを作成
    const existingFileName = 'test-article-diagram-12345678.svg';
    const existingFilePath = path.join(imagesDir, existingFileName);
    await fs.writeFile(existingFilePath, '<svg></svg>', 'utf-8');
    
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: quiverUrl.url,
        encodedData,
        imagePath: existingFilePath,
        timestamp: Date.now(),
      },
    ];
    
    const config = {
      strategy: 'browser' as const,
      input: quiverUrl.url,
    };
    
    const markdownDir = testDir;
    
    const result = await processSingleUrl(
      quiverUrl,
      config,
      'test-article',
      cache,
      imagesDir,
      markdownDir,
    );
    
    // キャッシュヒット: 置換不要
    expect(result.shouldReplace).toBe(false);
    expect(result.imagePath).toBe(existingFilePath);
  });
  
  it('should regenerate SVG when URL data changes', async () => {
    // 元のデータ
    const oldEncodedData = Buffer.from(JSON.stringify([
      [[0, 0, 'A'], [1, 0, 'B']],
      [[0, 1, 'f']],
    ])).toString('base64');
    
    // 新しいデータ
    const newEncodedData = Buffer.from(JSON.stringify([
      [[0, 0, 'X'], [1, 0, 'Y']],
      [[0, 1, 'g']],
    ])).toString('base64');
    
    const quiverUrl: QuiverUrl = {
      url: `https://q.uiver.app/#q=${newEncodedData}`,
      encodedData: newEncodedData,
      position: { start: 0, end: 100 },
    };
    
    // 古いデータでキャッシュエントリを作成
    const oldFileName = 'test-article-diagram-old.svg';
    const oldFilePath = path.join(imagesDir, oldFileName);
    await fs.writeFile(oldFilePath, '<svg>old</svg>', 'utf-8');
    
    const cache: ReadonlyArray<CacheEntry> = [
      {
        url: quiverUrl.url,
        encodedData: oldEncodedData, // 古いデータ
        imagePath: oldFilePath,
        timestamp: Date.now(),
      },
    ];
    
    const config = {
      strategy: 'browser' as const,
      input: quiverUrl.url,
    };
    
    const markdownDir = testDir;
    
    const result = await processSingleUrl(
      quiverUrl,
      config,
      'test-article',
      cache,
      imagesDir,
      markdownDir,
    );
    
    // URL変更: 再生成が必要
    expect(result.shouldReplace).toBe(true);
    expect(result.imagePath).toMatch(/.*\.svg$/);
  });
});
