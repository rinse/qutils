/**
 * キャッシュ管理機能
 * QuiverのURLと生成された画像のマッピングを管理
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CacheEntry, Url } from './types';

/**
 * キャッシュからエントリを取得
 * 
 * @param url - 検索するURL
 * @param cache - キャッシュエントリの配列
 * @returns 見つかったキャッシュエントリ、または undefined
 */
export const getCacheEntry = (
  url: Url,
  cache: ReadonlyArray<CacheEntry>,
): CacheEntry | undefined => {
  return cache.find(entry => entry.url === url);
};

/**
 * キャッシュにエントリを追加（イミュータブル）
 * 
 * 既に同じURLのエントリが存在する場合は、それを新しいエントリで置き換える
 * 
 * @param cache - 既存のキャッシュエントリの配列
 * @param entry - 追加する新しいキャッシュエントリ
 * @returns 新しいエントリを含む更新されたキャッシュ配列
 */
export const addCacheEntry = (
  cache: ReadonlyArray<CacheEntry>,
  entry: CacheEntry,
): ReadonlyArray<CacheEntry> => {
  // 既存のエントリを除外して新しいエントリを追加
  const filteredCache = cache.filter(e => e.url !== entry.url);
  return [...filteredCache, entry];
};

/**
 * URLが変更されたか確認
 * 
 * キャッシュ内のエントリと比較して、エンコードされたデータが変更されているか確認
 * 
 * @param url - 確認するURL
 * @param encodedData - 現在のエンコードされたデータ
 * @param cache - キャッシュエントリの配列
 * @returns URLが変更されている場合は true、それ以外は false
 */
export const hasUrlChanged = (
  url: Url,
  encodedData: string,
  cache: ReadonlyArray<CacheEntry>,
): boolean => {
  const entry = getCacheEntry(url, cache);
  
  // エントリが存在しない場合は「変更された」とみなす（新規URL）
  if (!entry) {
    return true;
  }
  
  // エンコードされたデータが異なる場合は変更されている
  return entry.encodedData !== encodedData;
};

/**
 * キャッシュをファイルシステムから読み込む
 * 
 * @param cacheFilePath - キャッシュファイルのパス
 * @returns 読み込まれたキャッシュエントリの配列
 */
export const loadCache = async (
  cacheFilePath: string,
): Promise<ReadonlyArray<CacheEntry>> => {
  try {
    const content = await fs.readFile(cacheFilePath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // 配列であることを確認
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed as ReadonlyArray<CacheEntry>;
  } catch {
    // ファイルが存在しない場合や読み込みエラーの場合は空の配列を返す
    return [];
  }
};

/**
 * キャッシュをファイルシステムに保存
 * 
 * @param cacheFilePath - キャッシュファイルのパス
 * @param cache - 保存するキャッシュエントリの配列
 */
export const saveCache = async (
  cacheFilePath: string,
  cache: ReadonlyArray<CacheEntry>,
): Promise<void> => {
  // ディレクトリが存在しない場合は作成
  const dir = path.dirname(cacheFilePath);
  await fs.mkdir(dir, { recursive: true });
  
  // キャッシュをJSON形式で保存
  const content = JSON.stringify(cache, null, 2);
  await fs.writeFile(cacheFilePath, content, 'utf-8');
};
