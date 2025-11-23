/**
 * ファイル操作関数
 * 画像ファイルの保存、ファイル名生成、マークダウン操作などを提供
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import type { DiagramData, QuiverUrl, FileIoError } from './types';

/**
 * 画像をファイルに保存
 * 保存に失敗した場合はFileIoErrorをスロー
 *
 * 注意: この関数は現在テストでのみ使用されています。
 * 実際の実装では、png-generatorが直接ファイルに書き込みます。
 *
 * @param imageData - 保存する画像データ（バイナリまたはテキスト）
 * @param filePath - 保存先のファイルパス
 */
export const saveImageToFile = async (imageData: string | Buffer, filePath: string): Promise<void> => {
  try {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // 画像ファイルを書き込み
    await fs.writeFile(filePath, imageData);
  } catch (error) {
    const fileIoError: FileIoError = {
      type: 'file-io-error',
      path: filePath,
      message: `Failed to save image file: ${error instanceof Error ? error.message : String(error)}`,
    };
    throw fileIoError;
  }
};

/**
 * パスを正規化（Windowsのバックスラッシュをスラッシュに変換）
 *
 * @param filePath - 正規化するパス
 * @returns 正規化されたパス
 */
const normalizePath = (filePath: string): string => {
  return filePath.replace(/\\/g, '/');
};

/**
 * 図式データから一意な識別子を生成
 * ノードとエッジの情報からハッシュを計算
 *
 * @param data - 図式データ
 * @returns 一意な識別子（短縮ハッシュ）
 */
const generateUniqueId = (data: DiagramData): string => {
  // 図式データを正規化された文字列に変換
  const normalized = JSON.stringify({
    nodes: data.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, label: n.label })),
    edges: data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      style: e.style,
    })),
  });

  // SHA-256ハッシュを計算し、最初の8文字を使用
  return createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 8);
};

/**
 * マークダウンファイルからcontent-typeを判定
 * articlesディレクトリなら'article'、booksディレクトリなら'book'
 *
 * @param markdownPath - マークダウンファイルのパス
 * @returns content-type ('article' または 'book')
 */
export const extractContentType = (markdownPath: string): 'article' | 'book' => {
  const normalizedPath = normalizePath(markdownPath);

  if (normalizedPath.includes('/articles/')) {
    return 'article';
  } else if (normalizedPath.includes('/books/')) {
    return 'book';
  }

  // articlesにもbooksにも該当しない場合は警告を出力
  // Zennプロジェクト構造を前提としているため、デフォルトで'article'を返す
  console.warn(`Warning: Path "${markdownPath}" does not match expected Zenn project structure (articles/ or books/). Defaulting to 'article'.`);
  return 'article';
};

/**
 * ファイル名を生成（content-type、slug、一意な識別子を含む）
 * 形式: {content-type}-{slug}-diagram-{uniqueId}.png
 * - articlesディレクトリ: article-{article-slug}-diagram-{uniqueId}.png
 * - booksディレクトリ: book-{book-slug}-{page-slug}-diagram-{uniqueId}.png
 *
 * @param contentType - content-type ('article' または 'book')
 * @param slug - 記事のslug
 * @param data - 図式データ
 * @param extension - ファイル拡張子（デフォルト: 'png'）
 * @returns 生成されたファイル名
 */
export const generateImageFileName = (
  contentType: 'article' | 'book',
  slug: string,
  data: DiagramData,
  extension: string = 'png',
): string => {
  const uniqueId = generateUniqueId(data);
  return `${contentType}-${slug}-diagram-${uniqueId}.${extension}`;
};

/**
 * マークダウンファイルからslugを抽出
 * - articlesディレクトリ: ファイル名から取得
 * - booksディレクトリ: {book-slug}-{page-slug}の形式で生成
 *
 * 注: この関数は内部でextractContentTypeを呼び出します。
 * これは、extractSlugが単独で使用されるケースを想定しているためです。
 * 呼び出し側で既にcontent-typeを持っている場合でも、
 * パフォーマンスへの影響は軽微であり、関数の独立性を優先しています。
 *
 * @param markdownPath - マークダウンファイルのパス
 * @param content - マークダウンファイルの内容
 * @returns 抽出されたslug
 */
export const extractSlug = (markdownPath: string, content: string): string => {
  const normalizedPath = normalizePath(markdownPath);
  const contentType = extractContentType(markdownPath);

  // フロントマターからslugを抽出を試みる
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const slugMatch = frontmatter.match(/slug:\s*["']?([^"'\n]+)["']?/);
    if (slugMatch) {
      return slugMatch[1].trim();
    }
  }

  // booksディレクトリの場合: {book-slug}-{page-slug}の形式
  // 注: 現在の実装は /books/{book-slug}/{page-slug}.md の構造のみを想定
  // より深いネスト（例: /books/my-book/chapter1/page1.md）は現在サポートしていません
  if (contentType === 'book') {
    const booksMatch = normalizedPath.match(/\/books\/([^/]+)\/([^/]+)\.md$/);
    if (booksMatch) {
      const bookSlug = booksMatch[1];
      const pageSlug = path.basename(booksMatch[2], path.extname(booksMatch[2]));
      return `${bookSlug}-${pageSlug}`;
    }
  }

  // articlesディレクトリの場合: ファイル名から取得
  const basename = path.basename(markdownPath, path.extname(markdownPath));
  return basename;
};

/**
 * マークダウンコンテンツ内のURLを画像参照に置き換え
 * 画像をクリックするとQuiverのページに飛ぶようにリンクを追加
 *
 * @param content - 元のマークダウンコンテンツ
 * @param url - 置き換え対象のQuiverUrl
 * @param imagePath - 画像ファイルのパス
 * @returns 更新されたマークダウンコンテンツ
 */
export const replaceUrlWithImageRef = (
  content: string,
  url: QuiverUrl,
  imagePath: string,
): string => {
  // 画像参照の形式: [![alt](path)](url)
  // 画像をクリックするとQuiverのページに飛ぶ
  const imageRef = `[![diagram](${imagePath})](${url.url})`;

  // URLを画像参照に置き換え
  // position情報を使用して正確に置換
  const before = content.substring(0, url.position.start);
  const after = content.substring(url.position.end);

  return before + imageRef + after;
};

/**
 * ファイルが存在するか確認
 *
 * @param filePath - 確認するファイルのパス
 * @returns ファイルが存在する場合true
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};
