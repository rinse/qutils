/**
 * URL処理機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { processSingleUrl } from './process-url';
import type { QuiverUrl, CacheEntry } from './types';

// 画像生成をモック
vi.mock('./image-generator', () => ({
  generateImage: vi.fn(async () => {}),
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

  it('should generate image for new URL', async () => {
    // 有効なQuiverのURLとデータ（新形式）
    const encodedData = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'A'], [1, 0, 'B'], // nodes
      [0, 1, 'f'], // edges
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

    const result = await processSingleUrl(
      quiverUrl,
      config,
      'article',
      'test-article',
      cache,
      imagesDir,
      testDir,
    );

    // 結果の検証
    expect(result.shouldReplace).toBe(true);
    expect(result.imagePath).toMatch(/^\/.*\.png$/); // 絶対パス（/始まり）
  });

  it('should skip generation for cached URL with existing file', async () => {
    // 有効なQuiverのURLとデータ（新形式）
    const encodedData = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'A'], [1, 0, 'B'], // nodes
      [0, 1, 'f'], // edges
    ])).toString('base64');

    const quiverUrl: QuiverUrl = {
      url: `https://q.uiver.app/#q=${encodedData}`,
      encodedData,
      position: { start: 0, end: 100 },
    };

    // 既存のファイルを作成
    const existingFileName = 'test-article-diagram-12345678.png';
    const existingFilePath = path.join(imagesDir, existingFileName);
    await fs.writeFile(existingFilePath, 'fake-png-data', 'utf-8');

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

    const result = await processSingleUrl(
      quiverUrl,
      config,
      'article',
      'test-article',
      cache,
      imagesDir,
      testDir,
    );

    // キャッシュヒット: 置換不要
    expect(result.shouldReplace).toBe(false);
    expect(result.imagePath).toBe(existingFilePath);
  });

  it('should regenerate image when URL data changes', async () => {
    // 元のデータ（新形式）
    const oldEncodedData = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'A'], [1, 0, 'B'], // nodes
      [0, 1, 'f'], // edges
    ])).toString('base64');

    // 新しいデータ（新形式）
    const newEncodedData = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'X'], [1, 0, 'Y'], // nodes
      [0, 1, 'g'], // edges
    ])).toString('base64');

    const quiverUrl: QuiverUrl = {
      url: `https://q.uiver.app/#q=${newEncodedData}`,
      encodedData: newEncodedData,
      position: { start: 0, end: 100 },
    };

    // 古いデータでキャッシュエントリを作成
    const oldFileName = 'test-article-diagram-old.png';
    const oldFilePath = path.join(imagesDir, oldFileName);
    await fs.writeFile(oldFilePath, 'old-png-data', 'utf-8');

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

    const result = await processSingleUrl(
      quiverUrl,
      config,
      'article',
      'test-article',
      cache,
      imagesDir,
      testDir,
    );

    // URL変更: 再生成が必要
    expect(result.shouldReplace).toBe(true);
    expect(result.imagePath).toMatch(/^\/.*\.png$/); // 絶対パス（/始まり）
  });
});


describe('processMarkdownFile', () => {
  const testDir = path.join(process.cwd(), 'test-output-markdown');
  const markdownPath = path.join(testDir, 'test-article.md');

  beforeEach(async () => {
    // テスト用ディレクトリを作成
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should process markdown file with Quiver URLs', async () => {
    // テスト用のマークダウンコンテンツを作成（新形式）
    const encodedData = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'A'], [1, 0, 'B'], // nodes
      [0, 1, 'f'], // edges
    ])).toString('base64');

    const quiverUrl = `https://q.uiver.app/#q=${encodedData}`;
    const markdownContent = `# Test Article

This is a test article with a Quiver diagram:

${quiverUrl}

End of article.`;

    // マークダウンファイルを作成
    await fs.writeFile(markdownPath, markdownContent, 'utf-8');

    const config = {
      strategy: 'browser' as const,
      input: quiverUrl,
    };

    const cache: ReadonlyArray<CacheEntry> = [];

    // processMarkdownFileをインポート
    const { processMarkdownFile } = await import('./process-url');

    const result = await processMarkdownFile(markdownPath, config, cache, testDir);

    // 結果の検証
    expect(result.generatedImages.length).toBe(1);
    expect(result.generatedImages[0]).toMatch(/^\/.*\.png$/); // 絶対パス（/始まり）
    expect(result.updatedCache.length).toBe(1);

    // コンテンツが更新されたか確認（リンク付き画像になっている）
    expect(result.updatedContent).toContain('[![diagram]');
    expect(result.updatedContent).toContain(`](${quiverUrl})`);

    // ファイルが更新されたか確認
    const updatedContent = await fs.readFile(markdownPath, 'utf-8');
    expect(updatedContent).toContain('[![diagram]');
    expect(updatedContent).toContain(`](${quiverUrl})`);
  });

  it('should handle markdown file with no Quiver URLs', async () => {
    // QuiverのURLを含まないマークダウンコンテンツ
    const markdownContent = `# Test Article

This is a test article without any Quiver diagrams.

Just plain text.`;

    // マークダウンファイルを作成
    await fs.writeFile(markdownPath, markdownContent, 'utf-8');

    const config = {
      strategy: 'browser' as const,
      input: 'https://q.uiver.app/#q=test',
    };

    const cache: ReadonlyArray<CacheEntry> = [];

    const { processMarkdownFile } = await import('./process-url');

    const result = await processMarkdownFile(markdownPath, config, cache, testDir);

    // 結果の検証
    expect(result.generatedImages.length).toBe(0);
    expect(result.updatedCache.length).toBe(0);
    expect(result.updatedContent).toBe(markdownContent);
  });

  it('should process multiple Quiver URLs in markdown file', async () => {
    // 複数のQuiverのURLを含むマークダウンコンテンツ（新形式）
    const encodedData1 = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'A'], [1, 0, 'B'], // nodes
      [0, 1, 'f'], // edges
    ])).toString('base64');

    const encodedData2 = Buffer.from(JSON.stringify([
      0, 2, // version, nodeCount
      [0, 0, 'X'], [1, 0, 'Y'], // nodes
      [0, 1, 'g'], // edges
    ])).toString('base64');

    const quiverUrl1 = `https://q.uiver.app/#q=${encodedData1}`;
    const quiverUrl2 = `https://q.uiver.app/#q=${encodedData2}`;

    const markdownContent = `# Test Article

First diagram:

${quiverUrl1}

Second diagram:

${quiverUrl2}

End of article.`;

    // マークダウンファイルを作成
    await fs.writeFile(markdownPath, markdownContent, 'utf-8');

    const config = {
      strategy: 'browser' as const,
      input: quiverUrl1,
    };

    const cache: ReadonlyArray<CacheEntry> = [];

    const { processMarkdownFile } = await import('./process-url');

    const result = await processMarkdownFile(markdownPath, config, cache, testDir);

    // 結果の検証
    expect(result.generatedImages.length).toBe(2);
    expect(result.updatedCache.length).toBe(2);

    // 両方のURLがリンク付き画像に置換されたか確認
    expect(result.updatedContent).toContain(`](${quiverUrl1})`);
    expect(result.updatedContent).toContain(`](${quiverUrl2})`);

    // 画像参照が2つ含まれているか確認
    const imageRefCount = (result.updatedContent.match(/!\[diagram\]/g) || []).length;
    expect(imageRefCount).toBe(2);
  });
});
