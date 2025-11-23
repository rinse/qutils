/**
 * ファイル操作関数のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as fc from 'fast-check';
import {
  saveImageToFile,
  generateImageFileName,
  extractSlug,
  replaceUrlWithImageRef,
  fileExists,
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

  describe('saveImageToFile', () => {
    it('should save image content to file', async () => {
      const imageData = '<svg><circle r="10"/></svg>';
      const filePath = path.join(tempDir, 'test.png');

      await saveImageToFile(imageData, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(imageData);
    });

    it('should create directory if it does not exist', async () => {
      const imageData = '<svg><circle r="10"/></svg>';
      const filePath = path.join(tempDir, 'subdir', 'test.png');

      await saveImageToFile(imageData, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(imageData);
    });

    it('should throw FileIoError on write failure', async () => {
      const imageData = '<svg><circle r="10"/></svg>';
      // 無効なパスを使用
      const filePath = path.join(tempDir, 'nonexistent', 'deeply', 'nested', 'path', '\0invalid', 'test.png');

      await expect(saveImageToFile(imageData, filePath)).rejects.toMatchObject({
        type: 'file-io-error',
        path: filePath,
      });
    });
  });

  describe('generateImageFileName', () => {
    it('should generate filename with slug and unique id', () => {
      const slug = 'my-article';
      const data: DiagramData = {
        nodes: [
          { id: 0, x: 0, y: 0, label: 'A' },
          { id: 1, x: 100, y: 0, label: 'B' },
        ],
        edges: [
          { id: 0, source: 0, target: 1, label: 'f' },
        ],
      };

      const filename = generateImageFileName(slug, data);

      expect(filename).toMatch(/^my-article-diagram-[a-f0-9]{8}\.png$/);
    });

    it('should generate same filename for same data', () => {
      const slug = 'article';
      const data: DiagramData = {
        nodes: [{ id: 0, x: 0, y: 0, label: 'X' }],
        edges: [],
      };

      const filename1 = generateImageFileName(slug, data);
      const filename2 = generateImageFileName(slug, data);

      expect(filename1).toBe(filename2);
    });

    it('should generate different filenames for different data', () => {
      const slug = 'article';
      const data1: DiagramData = {
        nodes: [{ id: 0, x: 0, y: 0, label: 'A' }],
        edges: [],
      };
      const data2: DiagramData = {
        nodes: [{ id: 0, x: 0, y: 0, label: 'B' }],
        edges: [],
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
        position: { start: 20, end: 49 }, // URLのみ（29文字）
      };
      const imagePath = './images/diagram.png';

      const result = replaceUrlWithImageRef(content, url, imagePath);

      // URLが画像リンクに置換され、クリックするとQuiverのページに飛ぶ
      expect(result).toBe('Check this diagram: [![diagram](./images/diagram.png)](https://q.uiver.app/#q=abc123) for details.');
    });

    it('should handle URL at the beginning of content', () => {
      const content = 'https://q.uiver.app/#q=xyz789 is the diagram.';
      const url: QuiverUrl = {
        url: 'https://q.uiver.app/#q=xyz789',
        encodedData: 'xyz789',
        position: { start: 0, end: 29 },
      };
      const imagePath = './images/test.png';

      const result = replaceUrlWithImageRef(content, url, imagePath);

      expect(result).toBe('[![diagram](./images/test.png)](https://q.uiver.app/#q=xyz789) is the diagram.');
    });

    it('should handle URL at the end of content', () => {
      const content = 'See: https://q.uiver.app/#q=end123';
      const url: QuiverUrl = {
        url: 'https://q.uiver.app/#q=end123',
        encodedData: 'end123',
        position: { start: 5, end: 35 },
      };
      const imagePath = './images/final.png';

      const result = replaceUrlWithImageRef(content, url, imagePath);

      expect(result).toBe('See: [![diagram](./images/final.png)](https://q.uiver.app/#q=end123)');
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
          position: { start, end },
        } as QuiverUrl,
      };
    });

    // 画像パスのジェネレーター
    const imagePathArbitrary = fc.oneof(
      // 相対パス
      fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/).map(name => `./${name}.png`),
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
      ).map(([dir, name]) => `./${dir}/${name}.png`),

      // 絶対パス風
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
      ).map(([dir, name]) => `/images/${dir}/${name}.png`),
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
        },
      ),
      { numRuns: 100 }, // 最低100回の反復を実行
    );
  });

  /**
   * **Feature: quiver-image-generator, Property 5: ファイル保存の成功**
   * **Validates: Requirements 1.4**
   *
   * 任意の画像データとファイルパスに対して、保存後にそのパスに
   * ファイルが存在するべきである
   */
  it('Property 5: ファイル保存の成功 - 保存後にファイルが存在する', async () => {
    // 画像データのジェネレーター（テスト用にSVG文字列を使用）
    // 有効なSVG要素を含む文字列を生成
    const svgContentArbitrary = fc.oneof(
      // 基本的なSVG要素
      fc.record({
        width: fc.integer({ min: 10, max: 1000 }),
        height: fc.integer({ min: 10, max: 1000 }),
        content: fc.string(),
      }).map(({ width, height, content }) =>
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`,
      ),

      // 円を含むSVG
      fc.record({
        cx: fc.integer({ min: 0, max: 500 }),
        cy: fc.integer({ min: 0, max: 500 }),
        r: fc.integer({ min: 1, max: 100 }),
      }).map(({ cx, cy, r }) =>
        `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="${cx}" cy="${cy}" r="${r}"/></svg>`,
      ),

      // パスを含むSVG
      fc.string().map((pathData) =>
        `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`,
      ),

      // テキストを含むSVG
      fc.string().map((text) =>
        `<svg xmlns="http://www.w3.org/2000/svg"><text>${text}</text></svg>`,
      ),

      // 空のSVG
      fc.constant('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),

      // 複雑なSVG（複数の要素）
      fc.record({
        circles: fc.array(fc.record({
          cx: fc.integer({ min: 0, max: 500 }),
          cy: fc.integer({ min: 0, max: 500 }),
          r: fc.integer({ min: 1, max: 50 }),
        }), { maxLength: 5 }),
        rects: fc.array(fc.record({
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
          width: fc.integer({ min: 1, max: 100 }),
          height: fc.integer({ min: 1, max: 100 }),
        }), { maxLength: 5 }),
      }).map(({ circles, rects }) => {
        const circleElements = circles.map(c =>
          `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`,
        ).join('');
        const rectElements = rects.map(r =>
          `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`,
        ).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg">${circleElements}${rectElements}</svg>`;
      }),
    );

    // ファイル名のジェネレーター
    // 有効なファイル名文字のみを使用（Windows/Unix互換）
    const fileNameArbitrary = fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/)
      .map((name) => `${name}.png`);

    // サブディレクトリのジェネレーター（オプション）
    const subDirArbitrary = fc.oneof(
      fc.constant(''), // サブディレクトリなし
      fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/), // 1階層
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
      ).map(([dir1, dir2]) => path.join(dir1, dir2)), // 2階層
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

          // 画像を保存
          await saveImageToFile(svgContent, filePath);

          // ファイルが存在することを確認
          const exists = await fileExists(filePath);
          expect(exists).toBe(true);

          // ファイルの内容が正しいことを確認
          const savedContent = await fs.readFile(filePath, 'utf-8');
          expect(savedContent).toBe(svgContent);

          // ファイルサイズが0より大きいことを確認（空でない）
          const stats = await fs.stat(filePath);
          expect(stats.size).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 }, // 最低100回の反復を実行
    );
  });
  /**
   * **Feature: quiver-image-generator, Property 7: ファイル名形式の遵守**
   * **Validates: Requirements 2.1**
   *
   * 生成されるファイル名は常に `{slug}-diagram-{uniqueId}.png` の形式であるべきである
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
            label: fc.string(),
          })),
          edges: fc.array(fc.record({
            id: fc.integer(),
            source: fc.integer(),
            target: fc.integer(),
            label: fc.string(),
            style: fc.string(), // 簡易的なスタイル
          })),
        }),
        (slug, data) => {
          const filename = generateImageFileName(slug, data as DiagramData);

          // 形式: {slug}-diagram-{uniqueId}.png
          // uniqueIdは8文字の16進数
          const regex = new RegExp(`^${slug}-diagram-[a-f0-9]{8}\\.png$`);
          expect(filename).toMatch(regex);
        },
      ),
    );
  });

  /**
   * **Feature: quiver-image-generator, Property 8: slug抽出の成功**
   * **Validates: Requirements 2.2**
   *
   * 任意のマークダウンファイルパスまたはメタデータに対して、
   * 有効なslugが抽出されるべきである
   */
  it('Property 8: slug抽出の成功 - フロントマターまたはファイル名からslugを抽出', () => {
    // フロントマターを持つマークダウンコンテンツのジェネレーター
    const frontmatterContentArbitrary = fc.record({
      slug: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
      title: fc.string({ maxLength: 100 }),
      otherFields: fc.string({ maxLength: 200 }),
    }).map(({ slug, title, otherFields }) => {
      // フロントマターの形式を様々にする
      const formats = [
        `---\nslug: ${slug}\ntitle: ${title}\n${otherFields}\n---\n\n# Content`,
        `---\nslug: "${slug}"\ntitle: ${title}\n---\n\n# Content`,
        `---\nslug: '${slug}'\ntitle: ${title}\n---\n\n# Content`,
        `---\ntitle: ${title}\nslug: ${slug}\n---\n\n# Content`,
      ];
      const content = formats[Math.floor(Math.random() * formats.length)];
      return { content, expectedSlug: slug };
    });

    // フロントマターなしのマークダウンコンテンツのジェネレーター
    const noFrontmatterContentArbitrary = fc.string({ maxLength: 500 })
      .filter(s => !s.startsWith('---')) // フロントマターでないことを保証
      .map(content => ({ content, expectedSlug: null }));

    // ファイルパスのジェネレーター
    const filePathArbitrary = fc.record({
      dir: fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
      filename: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
      ext: fc.constantFrom('.md', '.markdown'),
    }).map(({ dir, filename, ext }) => ({
      path: path.join('/', dir, filename + ext),
      expectedSlugFromFilename: filename,
    }));

    // テスト1: フロントマターからslugを抽出
    fc.assert(
      fc.property(
        frontmatterContentArbitrary,
        filePathArbitrary,
        ({ content, expectedSlug }, { path: filePath }) => {
          const slug = extractSlug(filePath, content);

          // フロントマターにslugがある場合、それが抽出されるべき
          expect(slug).toBe(expectedSlug);
          // slugは空でないべき
          expect(slug.length).toBeGreaterThan(0);
          // slugは有効な文字のみを含むべき
          expect(slug).toMatch(/^[a-zA-Z0-9_-]+$/);
        },
      ),
      { numRuns: 100 },
    );

    // テスト2: フロントマターがない場合、ファイル名からslugを抽出
    fc.assert(
      fc.property(
        noFrontmatterContentArbitrary,
        filePathArbitrary,
        ({ content }, { path: filePath, expectedSlugFromFilename }) => {
          const slug = extractSlug(filePath, content);

          // ファイル名からslugが抽出されるべき
          expect(slug).toBe(expectedSlugFromFilename);
          // slugは空でないべき
          expect(slug.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );

    // テスト3: フロントマターにslugがない場合、ファイル名からslugを抽出
    const frontmatterWithoutSlugArbitrary = fc.record({
      title: fc.string({ maxLength: 100 }),
      date: fc.string({ maxLength: 20 }),
    }).map(({ title, date }) => {
      const content = `---\ntitle: ${title}\ndate: ${date}\n---\n\n# Content`;
      return { content };
    });

    fc.assert(
      fc.property(
        frontmatterWithoutSlugArbitrary,
        filePathArbitrary,
        ({ content }, { path: filePath, expectedSlugFromFilename }) => {
          const slug = extractSlug(filePath, content);

          // ファイル名からslugが抽出されるべき
          expect(slug).toBe(expectedSlugFromFilename);
          // slugは空でないべき
          expect(slug.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: quiver-image-generator, Property 9: image-descriptionの一意性**
   * **Validates: Requirements 2.4**
   *
   * 任意の同じslugを持つ複数の異なる図式データに対して、
   * 生成されるすべてのimage-descriptionは互いに異なるべきである
   */
  it('Property 9: image-descriptionの一意性 - 異なる図式データは異なるファイル名を生成', () => {
    // 図式データのジェネレーター
    const diagramDataArbitrary = fc.record({
      nodes: fc.array(
        fc.record({
          id: fc.integer({ min: 0, max: 100 }),
          x: fc.integer({ min: -1000, max: 1000 }),
          y: fc.integer({ min: -1000, max: 1000 }),
          label: fc.string({ maxLength: 50 }),
        }),
        { minLength: 1, maxLength: 10 },
      ),
      edges: fc.array(
        fc.record({
          id: fc.integer({ min: 0, max: 100 }),
          source: fc.integer({ min: 0, max: 100 }),
          target: fc.integer({ min: 0, max: 100 }),
          label: fc.option(fc.string({ maxLength: 30 })),
          style: fc.option(fc.record({
            bodyName: fc.option(fc.string({ maxLength: 20 })),
            headName: fc.option(fc.string({ maxLength: 20 })),
            offset: fc.option(fc.integer({ min: -100, max: 100 })),
          })),
        }),
        { maxLength: 15 },
      ),
    }) as fc.Arbitrary<DiagramData>;

    // 同じslugで複数の異なる図式データを生成
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,30}$/), // slug
        fc.array(diagramDataArbitrary, { minLength: 2, maxLength: 20 }) // 複数の図式データ
          .filter((diagrams) => {
            // すべての図式データが異なることを保証
            // JSON文字列化して比較
            const serialized = diagrams.map(d => JSON.stringify(d));
            const uniqueSet = new Set(serialized);
            return uniqueSet.size === diagrams.length;
          }),
        (slug, diagrams) => {
          // 各図式データからファイル名を生成
          const filenames = diagrams.map(data => generateImageFileName(slug, data));

          // プロパティ1: すべてのファイル名が一意であるべき
          const uniqueFilenames = new Set(filenames);
          expect(uniqueFilenames.size).toBe(filenames.length);

          // プロパティ2: すべてのファイル名が正しい形式であるべき
          // 形式: {slug}-diagram-{8文字の16進数}.png
          const regex = new RegExp(`^${slug}-diagram-[a-f0-9]{8}\\.png$`);
          filenames.forEach(filename => {
            expect(filename).toMatch(regex);
          });

          // プロパティ3: 同じslugを使用しているべき
          filenames.forEach(filename => {
            expect(filename.startsWith(`${slug}-diagram-`)).toBe(true);
          });

          // プロパティ4: image-description部分（ハッシュ）が異なるべき
          // ファイル名から image-description を抽出
          const imageDescriptions = filenames.map(filename => {
            const match = filename.match(/-diagram-([a-f0-9]{8})\.png$/);
            return match ? match[1] : null;
          });

          // すべてのimage-descriptionが抽出できたことを確認
          expect(imageDescriptions.every(desc => desc !== null)).toBe(true);

          // すべてのimage-descriptionが一意であることを確認
          const uniqueDescriptions = new Set(imageDescriptions);
          expect(uniqueDescriptions.size).toBe(imageDescriptions.length);
        },
      ),
      { numRuns: 100 }, // 最低100回の反復を実行
    );
  });
});
