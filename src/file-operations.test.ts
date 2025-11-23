/**
 * ファイル操作関数のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as fc from 'fast-check';
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

/**
 * プロパティベーステスト
 * fast-checkを使用して、様々な入力に対する正確性を検証
 */
describe('Property-Based Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qutils-pbt-'));
  });

  afterEach(async () => {
    // テスト後にクリーンアップ
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // クリーンアップ失敗は無視
    }
  });

  /**
   * **Feature: quiver-image-generator, Property 6: URL置換の正確性**
   * **Validates: Requirements 1.5**
   * 
   * 任意のマークダウンコンテンツとQuiverのURLに対して、置換後の
   * コンテンツには元のURLが含まれず、画像参照が含まれるべきである
   */
  it('Property 6: URL置換の正確性 - 置換後にURLが画像参照になる', () => {
    // マークダウンコンテンツのジェネレーター
    // QuiverのURLを含む様々なコンテンツを生成
    const markdownContentArbitrary = fc.record({
      before: fc.string({ maxLength: 200 }),
      url: fc.record({
        encodedData: fc.stringMatching(/^[A-Za-z0-9_-]{10,50}$/),
      }),
      after: fc.string({ maxLength: 200 }),
    }).map(({ before, url, after }) => {
      const quiverUrl = `https://q.uiver.app/#q=${url.encodedData}`;
      const content = before + quiverUrl + after;
      const start = before.length;
      const end = start + quiverUrl.length;

      return {
        content,
        quiverUrl: {
          url: quiverUrl,
          encodedData: url.encodedData,
          position: { start, end }
        } as QuiverUrl
      };
    });

    // 画像パスのジェネレーター
    const imagePathArbitrary = fc.oneof(
      // 相対パス
      fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/).map(name => `./${name}.svg`),
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
      ).map(([dir, name]) => `./${dir}/${name}.svg`),

      // 絶対パス風
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
      ).map(([dir, name]) => `/images/${dir}/${name}.svg`)
    );

    fc.assert(
      fc.property(
        markdownContentArbitrary,
        imagePathArbitrary,
        ({ content, quiverUrl }, imagePath) => {
          // URL置換を実行
          const result = replaceUrlWithImageRef(content, quiverUrl, imagePath);

          // プロパティ1: 元のURLが含まれていないこと
          // ただし、画像リンクの一部として含まれる場合は除く
          // 画像リンク形式: [![diagram](path)](url)
          // URLは最後の括弧内にのみ存在するべき
          const urlOccurrences = (result.match(new RegExp(quiverUrl.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          expect(urlOccurrences).toBe(1); // 画像リンクの一部として1回だけ

          // プロパティ2: 画像参照が含まれていること
          // 形式: [![diagram](imagePath)](url)
          // 期待される画像参照を直接構築して文字列比較する方が確実
          const expectedImageRef = `[![diagram](${imagePath})](${quiverUrl.url})`;
          expect(result).toContain(expectedImageRef);

          // プロパティ3: 画像参照が正しい位置にあること
          // 元のURLの位置に画像参照が挿入されているべき
          const expectedResult =
            content.substring(0, quiverUrl.position.start) +
            expectedImageRef +
            content.substring(quiverUrl.position.end);
          expect(result).toBe(expectedResult);

          // プロパティ4: コンテンツの長さが適切に変化していること
          // 元のURL長 - 画像参照長 = 長さの差
          const lengthDiff = result.length - content.length;
          const expectedLengthDiff = expectedImageRef.length - quiverUrl.url.length;
          expect(lengthDiff).toBe(expectedLengthDiff);

          // プロパティ5: URL以外の部分は変更されていないこと
          const beforePart = result.substring(0, quiverUrl.position.start);
          const afterStartPos = quiverUrl.position.start + expectedImageRef.length;
          const afterPart = result.substring(afterStartPos);

          expect(beforePart).toBe(content.substring(0, quiverUrl.position.start));
          expect(afterPart).toBe(content.substring(quiverUrl.position.end));
        }
      ),
      { numRuns: 100 } // 最低100回の反復を実行
    );
  });

  /**
   * **Feature: quiver-image-generator, Property 5: ファイル保存の成功**
   * **Validates: Requirements 1.4**
   * 
   * 任意のSVG文字列とファイルパスに対して、保存後にそのパスに
   * ファイルが存在するべきである
   */
  it('Property 5: ファイル保存の成功 - 保存後にファイルが存在する', async () => {
    // SVG文字列のジェネレーター
    // 有効なSVG要素を含む文字列を生成
    const svgContentArbitrary = fc.oneof(
      // 基本的なSVG要素
      fc.record({
        width: fc.integer({ min: 10, max: 1000 }),
        height: fc.integer({ min: 10, max: 1000 }),
        content: fc.string()
      }).map(({ width, height, content }) =>
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`
      ),

      // 円を含むSVG
      fc.record({
        cx: fc.integer({ min: 0, max: 500 }),
        cy: fc.integer({ min: 0, max: 500 }),
        r: fc.integer({ min: 1, max: 100 })
      }).map(({ cx, cy, r }) =>
        `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="${cx}" cy="${cy}" r="${r}"/></svg>`
      ),

      // パスを含むSVG
      fc.string().map((pathData) =>
        `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`
      ),

      // テキストを含むSVG
      fc.string().map((text) =>
        `<svg xmlns="http://www.w3.org/2000/svg"><text>${text}</text></svg>`
      ),

      // 空のSVG
      fc.constant('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),

      // 複雑なSVG（複数の要素）
      fc.record({
        circles: fc.array(fc.record({
          cx: fc.integer({ min: 0, max: 500 }),
          cy: fc.integer({ min: 0, max: 500 }),
          r: fc.integer({ min: 1, max: 50 })
        }), { maxLength: 5 }),
        rects: fc.array(fc.record({
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
          width: fc.integer({ min: 1, max: 100 }),
          height: fc.integer({ min: 1, max: 100 })
        }), { maxLength: 5 })
      }).map(({ circles, rects }) => {
        const circleElements = circles.map(c =>
          `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`
        ).join('');
        const rectElements = rects.map(r =>
          `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`
        ).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg">${circleElements}${rectElements}</svg>`;
      })
    );

    // ファイル名のジェネレーター
    // 有効なファイル名文字のみを使用（Windows/Unix互換）
    const fileNameArbitrary = fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/)
      .map((name) => `${name}.svg`);

    // サブディレクトリのジェネレーター（オプション）
    const subDirArbitrary = fc.oneof(
      fc.constant(''), // サブディレクトリなし
      fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/), // 1階層
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
      ).map(([dir1, dir2]) => path.join(dir1, dir2)) // 2階層
    );

    await fc.assert(
      fc.asyncProperty(
        svgContentArbitrary,
        fileNameArbitrary,
        subDirArbitrary,
        async (svgContent, fileName, subDir) => {
          // ファイルパスを構築
          const filePath = subDir
            ? path.join(tempDir, subDir, fileName)
            : path.join(tempDir, fileName);

          // SVGを保存
          await saveSvgToFile(svgContent, filePath);

          // ファイルが存在することを確認
          const exists = await fileExists(filePath);
          expect(exists).toBe(true);

          // ファイルの内容が正しいことを確認
          const savedContent = await fs.readFile(filePath, 'utf-8');
          expect(savedContent).toBe(svgContent);

          // ファイルサイズが0より大きいことを確認（空でない）
          const stats = await fs.stat(filePath);
          expect(stats.size).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 } // 最低100回の反復を実行
    );
  });
  /**
   * **Feature: quiver-image-generator, Property 7: ファイル名形式の遵守**
   * **Validates: Requirements 2.1**
   * 
   * 生成されるファイル名は常に `{slug}-diagram-{uniqueId}.svg` の形式であるべきである
   */
  it('Property 7: ファイル名形式の遵守 - 指定された形式に従う', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/), // slug
        fc.record({
          nodes: fc.array(fc.record({
            id: fc.integer(),
            x: fc.integer(),
            y: fc.integer(),
            label: fc.string()
          })),
          edges: fc.array(fc.record({
            id: fc.integer(),
            source: fc.integer(),
            target: fc.integer(),
            label: fc.string(),
            style: fc.string() // 簡易的なスタイル
          }))
        }),
        (slug, data) => {
          const filename = generateImageFileName(slug, data as DiagramData);

          // 形式: {slug}-diagram-{uniqueId}.svg
          // uniqueIdは8文字の16進数
          const regex = new RegExp(`^${slug}-diagram-[a-f0-9]{8}\\.svg$`);
          expect(filename).toMatch(regex);
        }
      )
    );
  });
});
