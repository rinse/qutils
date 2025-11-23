/**
 * URL解析機能のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { parseQuiverUrl, extractQuiverUrls, isUrlReplaced } from './url-parser';
import type { QuiverUrl } from './types';
import * as fc from 'fast-check';

describe('parseQuiverUrl', () => {
  it('有効なQuiverのURLを正しく解析できる', () => {
    const url = 'https://q.uiver.app/#q=WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFsyLDAsIkMiXSxbMCwxLCJmIl0sWzEsMiwiZyJdXQ==';
    const position = { start: 0, end: url.length };
    
    const result = parseQuiverUrl(url, position);
    
    expect(result.url).toBe(url);
    expect(result.encodedData).toBe('WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFsyLDAsIkMiXSxbMCwxLCJmIl0sWzEsMiwiZyJdXQ==');
    expect(result.position).toEqual(position);
  });

  it('Base64データにパディング（=）が含まれる場合も正しく解析できる', () => {
    const url = 'https://q.uiver.app/#q=test==';
    const position = { start: 10, end: 40 };
    
    const result = parseQuiverUrl(url, position);
    
    expect(result.encodedData).toBe('test==');
  });

  it('不正なURLフォーマットの場合はエラーをスローする', () => {
    const url = 'https://example.com/invalid';
    const position = { start: 0, end: url.length };
    
    expect(() => parseQuiverUrl(url, position)).toThrow();
  });

  it('QuiverのドメインでないURLの場合はエラーをスローする', () => {
    const url = 'https://other-site.com/#q=test';
    const position = { start: 0, end: url.length };
    
    expect(() => parseQuiverUrl(url, position)).toThrow();
  });

  it('フラグメントがない場合はエラーをスローする', () => {
    const url = 'https://q.uiver.app/';
    const position = { start: 0, end: url.length };
    
    expect(() => parseQuiverUrl(url, position)).toThrow();
  });
});

describe('extractQuiverUrls', () => {
  it('マークダウンから単一のQuiverのURLを検出できる', () => {
    const content = `
# タイトル

可換図式の例：
https://q.uiver.app/#q=WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFsyLDAsIkMiXSxbMCwxLCJmIl0sWzEsMiwiZyJdXQ==

説明文
    `;
    
    const result = extractQuiverUrls(content);
    
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('https://q.uiver.app/#q=');
    expect(result[0].encodedData).toBe('WzAsMyxbMCwwLCJBIl0sWzEsMCwiQiJdLFsyLDAsIkMiXSxbMCwxLCJmIl0sWzEsMiwiZyJdXQ==');
  });

  it('マークダウンから複数のQuiverのURLを検出できる', () => {
    const content = `
# 図式1
https://q.uiver.app/#q=first

# 図式2
https://q.uiver.app/#q=second
    `;
    
    const result = extractQuiverUrls(content);
    
    expect(result).toHaveLength(2);
    expect(result[0].encodedData).toBe('first');
    expect(result[1].encodedData).toBe('second');
  });

  it('QuiverのURLが含まれない場合は空配列を返す', () => {
    const content = `
# タイトル

通常のテキスト
https://example.com/
    `;
    
    const result = extractQuiverUrls(content);
    
    expect(result).toHaveLength(0);
  });

  it('不正なURLは無視して有効なURLのみを返す', () => {
    const content = `
https://q.uiver.app/#q=valid
https://example.com/invalid
https://q.uiver.app/#q=another
    `;
    
    const result = extractQuiverUrls(content);
    
    expect(result).toHaveLength(2);
    expect(result[0].encodedData).toBe('valid');
    expect(result[1].encodedData).toBe('another');
  });

  it('URLの位置情報を正しく記録する', () => {
    const content = 'prefix https://q.uiver.app/#q=test suffix';
    
    const result = extractQuiverUrls(content);
    
    expect(result).toHaveLength(1);
    expect(result[0].position.start).toBe(7); // 'prefix 'の後
    expect(content.substring(result[0].position.start, result[0].position.end)).toBe(result[0].url);
  });

  it('実用的な可換図式（自然変換）のURLを正しく解析できる', () => {
    // 自然変換 θ: F ⇒ G を表す可換図式
    // 圏 C から圏 D への関手 F, G と、対象 A, B および射 f: A → B に対して
    // F(f) ∘ θ_A = θ_B ∘ G(f) が可換であることを示す図式
    const content = `
# 自然変換の可換性

関手 F, G: C → D と自然変換 θ: F ⇒ G について、以下の図式が可換である：

https://q.uiver.app/#q=WzAsOCxbMCwwLCJcXG1hdGhiZiBDIl0sWzAsMSwiQSJdLFswLDIsIkIiXSxbMSwwLCJcXG1hdGhiZiBEIl0sWzEsMSwiRihBKSJdLFsyLDEsIkYoQikiXSxbMSwyLCJHKEEpIl0sWzIsMiwiRyhCKSJdLFsxLDIsImYiXSxbNCw1LCJGKGYpIl0sWzQsNiwiXFx0aGV0YV9BIiwyXSxbNiw3LCJHKGYpIiwyXSxbNSw3LCJcXHRoZXRhX0IiXSxbNCw3LCJcXGNpcmNsZWFycm93cmlnaHQiLDEseyJzdHlsZSI6eyJib2R5Ijp7Im5hbWUiOiJub25lIn0sImhlYWQiOnsibmFtZSI6Im5vbmUifX19XV0=

すなわち、F(f) ∘ θ_A = θ_B ∘ G(f) が成り立つ。
    `;
    
    const result = extractQuiverUrls(content);
    
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('https://q.uiver.app/#q=');
    expect(result[0].encodedData).toBe('WzAsOCxbMCwwLCJcXG1hdGhiZiBDIl0sWzAsMSwiQSJdLFswLDIsIkIiXSxbMSwwLCJcXG1hdGhiZiBEIl0sWzEsMSwiRihBKSJdLFsyLDEsIkYoQikiXSxbMSwyLCJHKEEpIl0sWzIsMiwiRyhCKSJdLFsxLDIsImYiXSxbNCw1LCJGKGYpIl0sWzQsNiwiXFx0aGV0YV9BIiwyXSxbNiw3LCJHKGYpIiwyXSxbNSw3LCJcXHRoZXRhX0IiXSxbNCw3LCJcXGNpcmNsZWFycm93cmlnaHQiLDEseyJzdHlsZSI6eyJib2R5Ijp7Im5hbWUiOiJub25lIn0sImhlYWQiOnsibmFtZSI6Im5vbmUifX19XV0=');
    
    // URLが正しい位置に記録されていることを確認
    const extractedUrl = content.substring(result[0].position.start, result[0].position.end);
    expect(extractedUrl).toBe(result[0].url);
  });
});

describe('isUrlReplaced', () => {
  it('URLが画像参照に置き換えられている場合はtrueを返す', () => {
    const content = 'text before ![diagram](https://q.uiver.app/#q=test) text after';
    const urlStart = content.indexOf('https://q.uiver.app/#q=test');
    const urlEnd = urlStart + 'https://q.uiver.app/#q=test'.length;
    
    const url: QuiverUrl = {
      url: 'https://q.uiver.app/#q=test',
      encodedData: 'test',
      position: { start: urlStart, end: urlEnd }
    };
    
    const result = isUrlReplaced(content, url);
    
    expect(result).toBe(true);
  });

  it('URLが画像参照に置き換えられていない場合はfalseを返す', () => {
    const url: QuiverUrl = {
      url: 'https://q.uiver.app/#q=test',
      encodedData: 'test',
      position: { start: 12, end: 42 }
    };
    
    const content = 'text before https://q.uiver.app/#q=test text after';
    
    const result = isUrlReplaced(content, url);
    
    expect(result).toBe(false);
  });

  it('URLの前に画像参照の開始があるが後に終了がない場合はfalseを返す', () => {
    const url: QuiverUrl = {
      url: 'https://q.uiver.app/#q=test',
      encodedData: 'test',
      position: { start: 20, end: 50 }
    };
    
    const content = 'text before ![desc](https://q.uiver.app/#q=test text after';
    
    const result = isUrlReplaced(content, url);
    
    expect(result).toBe(false);
  });
});

/**
 * プロパティベーステスト
 * fast-checkを使用して、様々な入力に対する正確性を検証
 */
describe('Property-Based Tests', () => {
  /**
   * **Feature: quiver-image-generator, Property 2: データ抽出の成功**
   * **Validates: Requirements 1.2, 3.1**
   * 
   * 任意の有効なQuiverのURLに対して、URLのフラグメント部分から
   * Base64エンコードされたデータが正しく抽出されるべきである
   */
  it('Property 2: データ抽出の成功 - Base64データが正しく抽出される', () => {
    // Base64文字列のジェネレーター（URL-safe Base64）
    // Base64は [A-Za-z0-9+/] と末尾のパディング = で構成される
    // URL-safe Base64は [A-Za-z0-9_-] と末尾のパディング = で構成される
    const base64Arbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,200}={0,2}$/);
    
    fc.assert(
      fc.property(
        base64Arbitrary,
        fc.integer({ min: 0, max: 1000 }),
        (encodedData, startPos) => {
          // QuiverのURLを構築
          const url = `https://q.uiver.app/#q=${encodedData}`;
          const position = { start: startPos, end: startPos + url.length };
          
          // URLを解析
          const result = parseQuiverUrl(url, position);
          
          // エンコードされたデータが正しく抽出されることを確認
          expect(result.encodedData).toBe(encodedData);
          expect(result.url).toBe(url);
          expect(result.position).toEqual(position);
        }
      ),
      { numRuns: 100 } // 最低100回の反復を実行
    );
  });

  /**
   * **Feature: quiver-image-generator, Property 1: URL検出の完全性**
   * **Validates: Requirements 1.1**
   * 
   * 任意のマークダウンコンテンツに対して、ファイル内のすべてのQuiverのURL
   * （`https://q.uiver.app/#q=...`の形式）が検出されるべきである
   */
  it('Property 1: URL検出の完全性 - すべてのQuiverのURLが検出される', () => {
    // Base64文字列のジェネレーター（URL-safe Base64）
    const base64Arbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,100}={0,2}$/);
    
    // QuiverのURLジェネレーター
    const quiverUrlArbitrary = base64Arbitrary.map(
      (encodedData) => `https://q.uiver.app/#q=${encodedData}`
    );
    
    // マークダウンのテキスト断片ジェネレーター
    // QuiverのURLを含まず、Base64文字で終わらないようにする
    // （URLの直後にBase64文字が来ると、URLが拡張されてしまうため）
    const markdownFragmentArbitrary = fc.string().filter(
      (s) => !s.includes('https://q.uiver.app/#q=')
    ).map((s) => {
      // フラグメントがBase64文字で終わる場合、空白を追加してURLと区切る
      if (s.length > 0 && /[A-Za-z0-9_=-]$/.test(s)) {
        return s + ' ';
      }
      return s;
    });
    
    // テスト: 複数のQuiverのURLをランダムなマークダウンに埋め込む
    fc.assert(
      fc.property(
        fc.array(quiverUrlArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(markdownFragmentArbitrary, { minLength: 1, maxLength: 11 }),
        (urls, fragments) => {
          // URLとフラグメントを交互に配置してマークダウンを構築
          // fragments[0] + urls[0] + ' ' + fragments[1] + urls[1] + ' ' + ... + fragments[n]
          let content = '';
          const expectedUrls: string[] = [];
          
          for (let i = 0; i < urls.length; i++) {
            content += fragments[i] || '';
            content += urls[i];
            expectedUrls.push(urls[i]);
            // URLの後に空白を追加して、次のフラグメントと区切る
            content += ' ';
          }
          // 最後のフラグメントを追加
          if (fragments.length > urls.length) {
            content += fragments[fragments.length - 1];
          }
          
          // URLを抽出
          const result = extractQuiverUrls(content);
          
          // すべてのURLが検出されることを確認
          expect(result.length).toBe(expectedUrls.length);
          
          // 検出されたURLが期待されるURLと一致することを確認
          const detectedUrls = result.map((qu) => qu.url);
          expect(detectedUrls).toEqual(expectedUrls);
          
          // 各URLの位置情報が正確であることを確認
          result.forEach((quiverUrl) => {
            const extractedUrl = content.substring(
              quiverUrl.position.start,
              quiverUrl.position.end
            );
            expect(extractedUrl).toBe(quiverUrl.url);
          });
        }
      ),
      { numRuns: 100 } // 最低100回の反復を実行
    );
  });
});
