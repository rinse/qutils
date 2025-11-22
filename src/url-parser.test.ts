/**
 * URL解析機能のユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { parseQuiverUrl, extractQuiverUrls, isUrlReplaced } from './url-parser';
import type { QuiverUrl } from './types';

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
