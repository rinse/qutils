/**
 * ファイル操作関数
 * SVGファイルの保存、ファイル名生成、マークダウン操作などを提供
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import type { DiagramData, QuiverUrl, FileIoError } from './types';

/**
 * SVGをファイルに保存
 * 保存に失敗した場合はFileIoErrorをスロー
 *
 * @param svg - 保存するSVG文字列
 * @param filePath - 保存先のファイルパス
 */
export const saveSvgToFile = async (svg: string, filePath: string): Promise<void> => {
  try {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // SVGファイルを書き込み
    await fs.writeFile(filePath, svg, 'utf-8');
  } catch (error) {
    const fileIoError: FileIoError = {
      type: 'file-io-error',
      path: filePath,
      message: `Failed to save SVG file: ${error instanceof Error ? error.message : String(error)}`,
    };
    throw fileIoError;
  }
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
 * ファイル名を生成（一意な識別子を含む）
 * 形式: {slug}-{image-description}.svg
 *
 * @param slug - 記事のslug
 * @param data - 図式データ
 * @returns 生成されたファイル名
 */
export const generateImageFileName = (slug: string, data: DiagramData): string => {
  const uniqueId = generateUniqueId(data);
  return `${slug}-diagram-${uniqueId}.svg`;
};

/**
 * マークダウンファイルからslugを抽出
 * ファイル名またはフロントマターのメタデータから取得
 *
 * @param markdownPath - マークダウンファイルのパス
 * @param content - マークダウンファイルの内容
 * @returns 抽出されたslug
 */
export const extractSlug = (markdownPath: string, content: string): string => {
  // フロントマターからslugを抽出を試みる
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const slugMatch = frontmatter.match(/slug:\s*["']?([^"'\n]+)["']?/);
    if (slugMatch) {
      return slugMatch[1].trim();
    }
  }

  // フロントマターにslugがない場合、ファイル名から抽出
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
