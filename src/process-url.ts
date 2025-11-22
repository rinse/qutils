/**
 * URL処理機能
 * 単一のQuiverUrlを処理してSVGを生成
 */

import * as path from 'path';
import type { QuiverUrl, SvgGenerationConfig, CacheEntry } from './types';
import { decodeQuiverData } from './decoder';
import { generateSvg } from './svg-generator';
import { saveSvgToFile, generateImageFileName, fileExists } from './file-operations';
import { getCacheEntry, hasUrlChanged } from './cache';

/**
 * 単一のQuiverUrlを処理してSVGを生成
 * 
 * この関数は以下の処理を統合します：
 * 1. キャッシュチェック（URLが既に処理されているか確認）
 * 2. SVG生成（必要な場合のみ）
 * 3. ファイル保存
 * 
 * @param quiverUrl - 処理するQuiverUrl
 * @param config - SVG生成の設定
 * @param slug - 記事のslug（ファイル名生成に使用）
 * @param cache - 現在のキャッシュエントリの配列
 * @param imagesDir - 画像を保存するディレクトリのパス
 * @param markdownDir - マークダウンファイルのディレクトリ（相対パス計算に使用）
 * @returns 画像パスと置換すべきかどうかのフラグ
 * 
 * 要件: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3
 */
export const processSingleUrl = async (
  quiverUrl: QuiverUrl,
  config: SvgGenerationConfig,
  slug: string,
  cache: ReadonlyArray<CacheEntry>,
  imagesDir: string,
  markdownDir: string,
): Promise<{
  readonly imagePath: string;
  readonly shouldReplace: boolean;
}> => {
  // キャッシュエントリを確認
  const cacheEntry = getCacheEntry(quiverUrl.url, cache);
  
  // URLが変更されたか確認
  const urlChanged = hasUrlChanged(quiverUrl.url, quiverUrl.encodedData, cache);
  
  // キャッシュヒット: URLが変更されておらず、ファイルが存在する場合
  if (cacheEntry && !urlChanged) {
    const exists = await fileExists(cacheEntry.imagePath);
    if (exists) {
      // キャッシュヒット: 画像生成をスキップ
      return {
        imagePath: cacheEntry.imagePath,
        shouldReplace: false,
      };
    }
  }
  
  // キャッシュミスまたはURL変更: SVGを生成
  
  // 1. 図式データをデコード（ファイル名生成に必要）
  const diagramData = decodeQuiverData(quiverUrl.encodedData);
  
  // 2. ファイル名を生成
  const fileName = generateImageFileName(slug, diagramData);
  const fullPath = path.join(imagesDir, fileName);
  
  // 3. SVGを生成
  const svg = await generateSvg(config);
  
  // 4. SVGをファイルに保存
  await saveSvgToFile(svg, fullPath);
  
  // 5. 相対パスを返す（マークダウンファイルから見た相対パス）
  const relativePath = path.relative(markdownDir, fullPath).replace(/\\/g, '/');
  
  return {
    imagePath: relativePath,
    shouldReplace: true,
  };
};
