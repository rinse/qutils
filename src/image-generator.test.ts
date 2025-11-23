/**
 * 画像生成機能のテスト
 */

import { describe, it, expect, afterAll } from 'vitest';
import { generateImage } from './image-generator';
import { closeBrowser } from './png-generator';
import type { ImageGenerationConfig } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Image Generator', () => {
  // すべてのテスト後にブラウザをクローズ
  afterAll(async () => {
    await closeBrowser();
  });

  describe('generateImage', () => {
    it('should generate image from browser strategy config', async () => {
      // 簡単なQuiverの図式URL（2つのノードと1つのエッジ）
      const testUrl = 'https://q.uiver.app/#q=WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFswLDEsImYiXV0=';

      const config: ImageGenerationConfig = {
        strategy: 'browser',
        input: testUrl,
      };

      const outputPath = path.join(process.cwd(), 'test-output', 'test-image.png');

      await generateImage(config, outputPath);

      // ファイルが生成されたことを確認
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // クリーンアップ
      await fs.unlink(outputPath);
    }, 60000); // タイムアウトを60秒に設定（ブラウザ起動に時間がかかる）
  });
});
