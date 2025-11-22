/**
 * URL処理機能
 * 単一のQuiverUrlを処理してSVGを生成
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { QuiverUrl, SvgGenerationConfig, CacheEntry } from './types';
import { decodeQuiverData } from './decoder';
import { generateSvg } from './svg-generator';
import { saveSvgToFile, generateImageFileName, fileExists, extractSlug, replaceUrlWithImageRef } from './file-operations';
import { getCacheEntry, hasUrlChanged, addCacheEntry } from './cache';
import { extractQuiverUrls } from './url-parser';

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

/**
 * マークダウンファイルを処理
 * すべてのQuiverUrlを検出し、SVGを生成し、ファイルを更新
 *
 * この関数は以下の処理を統合します：
 * 1. マークダウンファイルの読み込み
 * 2. URL抽出（extractQuiverUrls）
 * 3. 各URLの処理（processSingleUrl）
 * 4. マークダウンの更新（replaceUrlWithImageRef）
 * 5. キャッシュの更新
 *
 * @param filePath - 処理するマークダウンファイルのパス
 * @param config - SVG生成の設定
 * @param cache - 現在のキャッシュエントリの配列
 * @returns 更新されたコンテンツ、更新されたキャッシュ、生成された画像のパス
 *
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export const processMarkdownFile = async (
  filePath: string,
  config: SvgGenerationConfig,
  cache: ReadonlyArray<CacheEntry>,
): Promise<{
  readonly updatedContent: string;
  readonly updatedCache: ReadonlyArray<CacheEntry>;
  readonly generatedImages: ReadonlyArray<string>;
}> => {
  // 1. マークダウンファイルを読み込む
  const content = await fs.readFile(filePath, 'utf-8');

  // 2. slugを抽出
  const slug = extractSlug(filePath, content);

  // 3. QuiverのURLを抽出
  const quiverUrls = extractQuiverUrls(content);

  // URLが見つからない場合は元のコンテンツとキャッシュを返す
  if (quiverUrls.length === 0) {
    return {
      updatedContent: content,
      updatedCache: cache,
      generatedImages: [],
    };
  }

  // 4. 各URLを処理
  // ディレクトリパスを計算
  const markdownDir = path.dirname(filePath);
  const imagesDir = path.join(markdownDir, 'images');

  // 処理結果を蓄積するための変数
  // イミュータブルな更新を行うため、reduceを使用
  type ProcessState = {
    readonly content: string;
    readonly cache: ReadonlyArray<CacheEntry>;
    readonly generatedImages: ReadonlyArray<string>;
    readonly offset: number; // 文字列置換による位置のオフセット
  };

  const initialState: ProcessState = {
    content,
    cache,
    generatedImages: [],
    offset: 0,
  };

  // URLを逆順で処理（後ろから置換することで位置のずれを防ぐ）
  const reversedUrls = [...quiverUrls].reverse();

  const finalState = await reversedUrls.reduce(
    async (statePromise: Promise<ProcessState>, quiverUrl: QuiverUrl): Promise<ProcessState> => {
      const state = await statePromise;

      try {
        // 単一URLを処理
        const result = await processSingleUrl(
          quiverUrl,
          config,
          slug,
          state.cache,
          imagesDir,
          markdownDir,
        );

        // 置換が必要な場合のみコンテンツを更新
        if (result.shouldReplace) {
          // 位置を調整したQuiverUrlを作成
          const adjustedUrl: QuiverUrl = {
            ...quiverUrl,
            position: {
              start: quiverUrl.position.start,
              end: quiverUrl.position.end,
            },
          };

          // コンテンツを更新
          const updatedContent = replaceUrlWithImageRef(
            state.content,
            adjustedUrl,
            result.imagePath,
          );

          // キャッシュエントリを追加
          const newCacheEntry: CacheEntry = {
            url: quiverUrl.url,
            encodedData: quiverUrl.encodedData,
            imagePath: result.imagePath,
            timestamp: Date.now(),
          };

          const updatedCache = addCacheEntry(state.cache, newCacheEntry);

          return {
            content: updatedContent,
            cache: updatedCache,
            generatedImages: [...state.generatedImages, result.imagePath],
            offset: state.offset,
          };
        } else {
          // キャッシュヒット: 置換不要
          return state;
        }
      } catch (error) {
        // エラーが発生した場合は警告を出力してスキップ
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to process URL at position ${quiverUrl.position.start}: ${errorMessage}`);
        return state;
      }
    },
    Promise.resolve(initialState),
  );

  // 5. 更新されたコンテンツをファイルに書き込む
  if (finalState.content !== content) {
    await fs.writeFile(filePath, finalState.content, 'utf-8');
  }

  return {
    updatedContent: finalState.content,
    updatedCache: finalState.cache,
    generatedImages: finalState.generatedImages,
  };
};
