/**
 * URL処理機能
 * 単一のQuiverUrlを処理して画像を生成
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { QuiverUrl, ImageGenerationConfig, CacheEntry, FileIoError } from './types';
import { decodeQuiverData } from './decoder';
import { generateImage } from './image-generator';
import { generateImageFileName, fileExists, extractSlug, extractContentType, replaceUrlWithImageRef } from './file-operations';
import { getCacheEntry, hasUrlChanged, addCacheEntry } from './cache';
import { extractQuiverUrls } from './url-parser';

/**
 * 画像を保存するディレクトリ名
 * プロジェクトルートからの相対パス
 */
const IMAGES_DIR_NAME = 'images';

/**
 * ディレクトリが存在することを保証（存在しない場合は作成）
 * 純粋でない関数: ファイルシステムへの副作用あり
 *
 * @param dirPath - 確認・作成するディレクトリのパス
 * @throws FileIoError ディレクトリの作成に失敗した場合
 */
const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    const fileIoError: FileIoError = {
      type: 'file-io-error',
      path: dirPath,
      message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
    };
    throw fileIoError;
  }
};

/**
 * 単一のQuiverUrlを処理して画像を生成
 *
 * この関数は以下の処理を統合します：
 * 1. キャッシュチェック（URLが既に処理されているか確認）
 * 2. 画像生成（必要な場合のみ）
 * 3. ファイル保存
 *
 * @param quiverUrl - 処理するQuiverUrl
 * @param config - 画像生成の設定
 * @param contentType - content-type ('article' または 'book')
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
  config: ImageGenerationConfig,
  contentType: 'article' | 'book',
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

  // キャッシュミスまたはURL変更: 画像を生成

  // 1. 図式データをデコード（ファイル名生成に必要）
  const diagramData = decodeQuiverData(quiverUrl.encodedData);

  // 2. ファイル名を生成
  const fileName = generateImageFileName(contentType, slug, diagramData);
  const fullPath = path.join(imagesDir, fileName);

  // 3. 画像を生成（戦略に基づいて適切な生成方法が選択される）
  await generateImage(config, fullPath);

  // 4. 相対パスを返す（マークダウンファイルから見た相対パス）
  const relativePath = path.relative(markdownDir, fullPath).replace(/\\/g, '/');

  return {
    imagePath: relativePath,
    shouldReplace: true,
  };
};

/**
 * マークダウンファイルを処理
 * すべてのQuiverUrlを検出し、画像を生成し、ファイルを更新
 *
 * この関数は以下の処理を統合します：
 * 1. マークダウンファイルの読み込み
 * 2. URL抽出（extractQuiverUrls）
 * 3. 各URLの処理（processSingleUrl）
 * 4. マークダウンの更新（replaceUrlWithImageRef）
 * 5. キャッシュの更新
 *
 * @param filePath - 処理するマークダウンファイルのパス
 * @param config - 画像生成の設定
 * @param cache - 現在のキャッシュエントリの配列
 * @param workspaceRoot - ワークスペースのルートディレクトリ
 * @returns 更新されたコンテンツ、更新されたキャッシュ、生成された画像のパス
 *
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export const processMarkdownFile = async (
  filePath: string,
  config: ImageGenerationConfig,
  cache: ReadonlyArray<CacheEntry>,
  workspaceRoot: string,
): Promise<{
  readonly updatedContent: string;
  readonly updatedCache: ReadonlyArray<CacheEntry>;
  readonly generatedImages: ReadonlyArray<string>;
}> => {
  // 1. マークダウンファイルを読み込む
  const content = await fs.readFile(filePath, 'utf-8');

  // 2. content-typeとslugを抽出
  // contentTypeを先に計算し、extractSlugに渡すことで再計算を避ける
  const contentType = extractContentType(filePath);
  const slug = extractSlug(filePath, content, contentType);

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
  const imagesDir = path.join(workspaceRoot, IMAGES_DIR_NAME);

  // imagesディレクトリが存在することを保証
  // ディレクトリ作成処理を別関数に抽出し、責務を分離
  await ensureDirectoryExists(imagesDir);

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
        // configにURLを設定
        const urlConfig: ImageGenerationConfig = {
          ...config,
          input: quiverUrl.url,
        };

        const result = await processSingleUrl(
          quiverUrl,
          urlConfig,
          contentType,
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
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.warn(`Failed to process URL at position ${quiverUrl.position.start}:`, error);
        throw new Error(`Failed to process URL at position ${quiverUrl.position.start}: ${errorMessage}`);
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
