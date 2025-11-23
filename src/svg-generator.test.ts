/**
 * SVG生成機能のテスト
 */

import { describe, it, expect, afterAll } from 'vitest';
import { generateSvg, generateSvgFromBrowser, closeBrowser } from './svg-generator';
import type { SvgGenerationConfig } from './types';

describe('SVG Generator', () => {
  // すべてのテスト後にブラウザをクローズ
  afterAll(async () => {
    await closeBrowser();
  });

  describe('generateSvg', () => {
    it('should generate SVG from browser strategy config', async () => {
      // 簡単なQuiverの図式URL（2つのノードと1つのエッジ）
      const testUrl = 'https://q.uiver.app/#q=WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFswLDEsImYiXV0=';

      const config: SvgGenerationConfig = {
        strategy: 'browser',
        input: testUrl,
      };

      const svg = await generateSvg(config);

      // SVGが生成されたことを確認
      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('<rect width="100%" height="100%" fill="white"/>');
      expect(svg).toContain('</svg>');
    }, 60000); // タイムアウトを60秒に設定（ブラウザ起動に時間がかかる）
  });

  describe('generateSvgFromBrowser', () => {
    it('should extract SVG from Quiver page', async () => {
      // 簡単なQuiverの図式URL
      const testUrl = 'https://q.uiver.app/#q=WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFswLDEsImYiXV0=';

      const svg = await generateSvgFromBrowser(testUrl);

      // SVGの基本的な構造を確認
      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg.length).toBeGreaterThan(0);
    }, 60000);

    it('should throw error for invalid URL', async () => {
      const invalidUrl = 'https://invalid-url.com';

      await expect(generateSvgFromBrowser(invalidUrl)).rejects.toMatchObject({
        type: 'svg-generation-error',
      });
    }, 60000);
  });
});
