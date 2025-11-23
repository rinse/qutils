/**
 * PNG生成機能のテスト
 */

import { describe, it, expect, afterAll } from 'vitest';
import { generatePngFromBrowser, closeBrowser } from './png-generator';
import type { BrowserStrategy } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PNG Generator', () => {
  // すべてのテスト後にブラウザをクローズ
  afterAll(async () => {
    await closeBrowser();
  });

  describe('generatePngFromBrowser', () => {
    it('should generate PNG from Quiver page', async () => {
      // 簡単なQuiverの図式URL（2つのノードと1つのエッジ）
      const testUrl = 'https://q.uiver.app/#q=WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFswLDEsImYiXV0=';

      const config: BrowserStrategy = {
        strategy: 'browser',
        input: testUrl,
      };

      const outputPath = path.join(process.cwd(), 'test-output', 'test-diagram.png');

      await generatePngFromBrowser(config, outputPath);

      // ファイルが生成されたことを確認
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // ファイルサイズが0より大きいことを確認
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);

      // クリーンアップ
      await fs.unlink(outputPath);
    }, 60000); // タイムアウトを60秒に設定（ブラウザ起動に時間がかかる）

    it('should throw error for invalid URL', async () => {
      const invalidUrl = 'https://invalid-url.com';

      const config: BrowserStrategy = {
        strategy: 'browser',
        input: invalidUrl,
      };

      const outputPath = path.join(process.cwd(), 'test-output', 'invalid.png');

      await expect(generatePngFromBrowser(config, outputPath)).rejects.toMatchObject({
        type: 'image-generation-error',
      });
    }, 60000);
  });
});
