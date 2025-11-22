/**
 * ファイル操作関数のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  saveSvgToFile,
  generateImageFileName,
  extractSlug,
  replaceUrlWithImageRef,
  fileExists
} from './file-operations';
import type { DiagramData, QuiverUrl } from './types';

describe('file-operations', () => {
  let tempDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qutils-test-'));
  });

  afterEach(async () => {
    // テスト後にクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // クリーンアップ失敗は無視
    }
  });

  describe('saveSvgToFile', () => {
    it('should save SVG content to file', async () => {
      const svg = '<svg><circle r="10"/></svg>';
      const filePath = path.join(tempDir, 'test.svg');

      await saveSvgToFile(svg, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(svg);
    });

    it('should create directory if it does not exist', async () => {
      const svg = '<svg><circle r="10"/></svg>';
      const filePath = path.join(tempDir, 'subdir', 'test.svg');

      await saveSvgToFile(svg, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(svg);
    });

    it('should throw FileIoError on write failure', async () => {
      const svg = '<svg><circle r="10"/></svg>';
      // 無効なパスを使用
      const filePath = path.join(tempDir, 'nonexistent', 'deeply', 'nested', 'path', '\0invalid', 'test.svg');

      await expect(saveSvgToFile(svg, filePath)).rejects.toMatchObject({
        type: 'file-io-error',
        path: filePath
      });
    });
  });

  describe('generateImageFileName', () => {
    it('should generate filename with slug and unique id', () => {
      const slug = 'my-article';
      const data: DiagramData = {
        nodes: [
          { id: 0, x: 0, y: 0, label: 'A' },
          { id: 1, x: 100, y: 0, label: 'B' }
        ],
        edges: [
          { id: 0, source: 0, target: 1, label: 'f' }
        ]
      };

      const filename = generateImageFileName(slug, data);

      expect(filename).toMatch(/^my-article-diagram-[a-f0-9]{8}\.svg$/);
    });

    it('should generate same filename for same data', () => {
      const slug = 'article';
      const data: DiagramData = {
        nodes: [{ id: 0, x: 0, y: 0, label: 'X' }],
        edges: []
      };

      const filename1 = generateImageFileName(slug, data);
      const filename2 = generateImageFileName(slug, data);

      expect(filename1).toBe(filename2);
    });

    it('should generate different filenames for different data', () => {
      const slug = 'article';
      const data1: DiagramData = {
        nodes: [{ id: 0, x: 0, y: 0, label: 'A' }],
        edges: []
      };
      const data2: DiagramData = {
        nodes: [{ id: 0, x: 0, y: 0, label: 'B' }],
        edges: []
      };

      const filename1 = generateImageFileName(slug, data1);
      const filename2 = generateImageFileName(slug, data2);

      expect(filename1).not.toBe(filename2);
    });
  });

  describe('extractSlug', () => {
    it('should extract slug from frontmatter', () => {
      const content = `---
title: My Article
slug: my-custom-slug
date: 2024-01-01
---

# Content here`;
      const markdownPath = '/path/to/article.md';

      const slug = extractSlug(markdownPath, content);

      expect(slug).toBe('my-custom-slug');
    });

    it('should extract slug from filename if no frontmatter', () => {
      const content = '# Article without frontmatter';
      const markdownPath = '/path/to/my-article-name.md';

      const slug = extractSlug(markdownPath, content);

      expect(slug).toBe('my-article-name');
    });

    it('should extract slug from filename if frontmatter has no slug', () => {
      const content = `---
title: My Article
date: 2024-01-01
---

# Content`;
      const markdownPath = '/path/to/fallback-slug.md';

      const slug = extractSlug(markdownPath, content);

      expect(slug).toBe('fallback-slug');
    });

    it('should handle slug with quotes in frontmatter', () => {
      const content = `---
slug: "quoted-slug"
---`;
      const markdownPath = '/path/to/article.md';

      const slug = extractSlug(markdownPath, content);

      expect(slug).toBe('quoted-slug');
    });
  });

  describe('replaceUrlWithImageRef', () => {
    it('should replace URL with linked image reference', () => {
      const content = 'Check this diagram: https://q.uiver.app/#q=abc123 for details.';
      const url: QuiverUrl = {
        url: 'https://q.uiver.app/#q=abc123',
        encodedData: 'abc123',
        position: { start: 20, end: 49 } // URLのみ（29文字）
      };
      const imagePath = './images/diagram.svg';

      const result = replaceUrlWithImageRef(content, url, imagePath);

      // URLが画像リンクに置換され、クリックするとQuiverのページに飛ぶ
      expect(result).toBe('Check this diagram: [![diagram](./images/diagram.svg)](https://q.uiver.app/#q=abc123) for details.');
    });

    it('should handle URL at the beginning of content', () => {
      const content = 'https://q.uiver.app/#q=xyz789 is the diagram.';
      const url: QuiverUrl = {
        url: 'https://q.uiver.app/#q=xyz789',
        encodedData: 'xyz789',
        position: { start: 0, end: 29 }
      };
      const imagePath = './images/test.svg';

      const result = replaceUrlWithImageRef(content, url, imagePath);

      expect(result).toBe('[![diagram](./images/test.svg)](https://q.uiver.app/#q=xyz789) is the diagram.');
    });

    it('should handle URL at the end of content', () => {
      const content = 'See: https://q.uiver.app/#q=end123';
      const url: QuiverUrl = {
        url: 'https://q.uiver.app/#q=end123',
        encodedData: 'end123',
        position: { start: 5, end: 35 }
      };
      const imagePath = './images/final.svg';

      const result = replaceUrlWithImageRef(content, url, imagePath);

      expect(result).toBe('See: [![diagram](./images/final.svg)](https://q.uiver.app/#q=end123)');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const exists = await fileExists(filePath);

      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.txt');

      const exists = await fileExists(filePath);

      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(tempDir, 'subdir');
      await fs.mkdir(dirPath);

      const exists = await fileExists(dirPath);

      expect(exists).toBe(true);
    });
  });
});
