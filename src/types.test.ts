/**
 * 型定義の基本的なテスト
 * プロジェクト構造が正しくセットアップされているか確認
 */

import { describe, it, expect } from 'vitest';
import type {
  QuiverUrl,
  DiagramData,
  Node,
  Edge,
  BrowserStrategy,
  SvgGenerationConfig,
  CacheEntry,
  QutilsError,
  UrlParseError,
} from './types';

describe('型定義の基本テスト', () => {
  it('QuiverUrl型のオブジェクトを作成できる', () => {
    const quiverUrl: QuiverUrl = {
      url: 'https://q.uiver.app/#q=test',
      encodedData: 'test',
      position: {
        start: 0,
        end: 10,
      },
    };

    expect(quiverUrl.url).toBe('https://q.uiver.app/#q=test');
    expect(quiverUrl.encodedData).toBe('test');
    expect(quiverUrl.position.start).toBe(0);
    expect(quiverUrl.position.end).toBe(10);
  });

  it('DiagramData型のオブジェクトを作成できる', () => {
    const node: Node = {
      id: 0,
      x: 0,
      y: 0,
      label: 'A',
    };

    const edge: Edge = {
      id: 0,
      source: 0,
      target: 1,
      label: 'f',
    };

    const diagramData: DiagramData = {
      nodes: [node],
      edges: [edge],
    };

    expect(diagramData.nodes).toHaveLength(1);
    expect(diagramData.edges).toHaveLength(1);
    expect(diagramData.nodes[0].label).toBe('A');
    expect(diagramData.edges[0].label).toBe('f');
  });

  it('BrowserStrategy型のオブジェクトを作成できる', () => {
    const strategy: BrowserStrategy = {
      strategy: 'browser',
      input: 'https://q.uiver.app/#q=test',
    };

    expect(strategy.strategy).toBe('browser');
    expect(strategy.input).toBe('https://q.uiver.app/#q=test');
  });

  it('SvgGenerationConfig型はBrowserStrategyと互換性がある', () => {
    const config: SvgGenerationConfig = {
      strategy: 'browser',
      input: 'https://q.uiver.app/#q=test',
    };

    expect(config.strategy).toBe('browser');
  });

  it('CacheEntry型のオブジェクトを作成できる', () => {
    const cacheEntry: CacheEntry = {
      url: 'https://q.uiver.app/#q=test',
      encodedData: 'test',
      imagePath: '/path/to/image.svg',
      timestamp: Date.now(),
    };

    expect(cacheEntry.url).toBe('https://q.uiver.app/#q=test');
    expect(cacheEntry.imagePath).toBe('/path/to/image.svg');
  });

  it('UrlParseError型のオブジェクトを作成できる', () => {
    const error: UrlParseError = {
      type: 'url-parse-error',
      url: 'invalid-url',
      message: 'Invalid URL format',
    };

    expect(error.type).toBe('url-parse-error');
    expect(error.url).toBe('invalid-url');
  });

  it('QutilsError型は各エラー型と互換性がある', () => {
    const urlError: QutilsError = {
      type: 'url-parse-error',
      url: 'invalid',
      message: 'error',
    };

    const decodeError: QutilsError = {
      type: 'decode-error',
      data: 'invalid',
      message: 'error',
    };

    const svgError: QutilsError = {
      type: 'svg-generation-error',
      config: { strategy: 'browser', input: 'url' },
      message: 'error',
    };

    const fileError: QutilsError = {
      type: 'file-io-error',
      path: '/path',
      message: 'error',
    };

    expect(urlError.type).toBe('url-parse-error');
    expect(decodeError.type).toBe('decode-error');
    expect(svgError.type).toBe('svg-generation-error');
    expect(fileError.type).toBe('file-io-error');
  });
});
