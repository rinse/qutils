/**
 * URL解析機能
 * QuiverのURLを検出し、Base64データを抽出する
 */

import { Url, QuiverUrl, UrlParseError } from './types';

/**
 * QuiverのURLパターン
 * https://q.uiver.app/#q=<Base64データ>
 */
const QUIVER_URL_PATTERN = /https:\/\/q\.uiver\.app\/#q=([A-Za-z0-9_-]+={0,2})/g;



/**
 * 生のURL文字列からQuiverUrlを構築
 * URLが不正な形式の場合はUrlParseErrorをスロー
 *
 * @param url - 解析対象のURL文字列
 * @param position - マークダウンファイル内の位置
 * @returns 解析済みのQuiverUrl
 * @throws {UrlParseError} URLが不正な形式の場合
 */
export const parseQuiverUrl = (
  url: Url,
  position: { readonly start: number; readonly end: number },
): QuiverUrl => {
  // URLがQuiverのURLパターンに一致するか確認
  const match = url.match(/https:\/\/q\.uiver\.app\/#q=([A-Za-z0-9_-]+={0,2})/);

  if (!match || !match[1]) {
    const error: UrlParseError = {
      type: 'url-parse-error',
      url,
      message: `Invalid Quiver URL format: ${url}`,
    };
    throw error;
  }

  const encodedData = match[1];

  return {
    url,
    encodedData,
    position,
  };
};

/**
 * URLがすでにマークダウンのリンク構文内にあるか確認
 * リンク構文: [text](URL) または [![alt](img)](URL)
 *
 * @param content - マークダウンコンテンツ
 * @param urlStart - URLの開始位置
 * @returns リンク構文内にある場合はtrue
 */
const isUrlInLinkSyntax = (content: string, urlStart: number): boolean => {
  // URLの前の部分を確認（最大200文字前まで）
  const beforeUrl = content.substring(Math.max(0, urlStart - 200), urlStart);

  // 最後の '](' を探す
  const lastLinkStart = beforeUrl.lastIndexOf('](');

  if (lastLinkStart === -1) {
    return false;
  }

  // '](' の後にURLが直接続いているか確認
  const textBetween = beforeUrl.substring(lastLinkStart + 2);

  // '](' とURLの間に空白以外の文字がある場合は別のリンク
  return textBetween.trim() === '';
};

/**
 * マークダウンコンテンツからQuiverのURLを抽出
 * 不正なURLはスキップされ、有効なURLのみ返される
 * すでにリンク構文内にあるURLは除外される
 *
 * @param content - マークダウンコンテンツ
 * @returns 検出されたQuiverUrlの配列
 */
export const extractQuiverUrls = (content: string): ReadonlyArray<QuiverUrl> => {
  const urls: QuiverUrl[] = [];

  // グローバルマッチでQuiverのURLを検出
  const regex = new RegExp(QUIVER_URL_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;

    // すでにリンク構文内にあるURLはスキップ
    if (isUrlInLinkSyntax(content, start)) {
      continue;
    }

    try {
      // parseQuiverUrlを使用して検証
      const quiverUrl = parseQuiverUrl(url, { start, end });
      urls.push(quiverUrl);
    } catch (error) {
      // 不正なURLはスキップし、警告を出力
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping invalid Quiver URL at position ${start}: ${errorMessage}`);
      continue;
    }
  }

  return urls;
};

/**
 * URLが既に画像参照に置き換えられているか確認
 *
 * @param content - マークダウンコンテンツ
 * @param url - 確認対象のQuiverUrl
 * @returns URLが画像参照に置き換えられている場合はtrue
 */
export const isUrlReplaced = (content: string, url: QuiverUrl): boolean => {
  // URLの前後のコンテキストを確認
  const beforeUrl = content.substring(Math.max(0, url.position.start - 50), url.position.start);
  const afterUrl = content.substring(url.position.end, Math.min(content.length, url.position.end + 50));

  // URLの前に画像参照の開始パターンがあるか確認
  // ![...](の形式
  const hasImageRefBefore = /!\[.*?\]\($/.test(beforeUrl);

  // URLの後に画像参照の終了パターンがあるか確認
  // )の形式
  const hasImageRefAfter = /^\)/.test(afterUrl);

  return hasImageRefBefore && hasImageRefAfter;
};
