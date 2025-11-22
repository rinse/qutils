/**
 * デコーダー関数のテスト
 */

import { describe, it, expect } from 'vitest';
import { decodeQuiverData, validateDiagramData } from './decoder';
import { DiagramData } from './types';

describe('decodeQuiverData', () => {
  it('有効なQuiverデータをデコードできる', () => {
    // Quiverのフォーマット: [[nodes], [edges]]
    // nodes: [x, y, label]
    // edges: [source, target, label?, options?]
    const data = [
      [[0, 0, 'A'], [1, 0, 'B']],
      [[0, 1, 'f']]
    ];
    const jsonString = JSON.stringify(data);
    const encodedData = Buffer.from(jsonString, 'utf-8').toString('base64');

    const result = decodeQuiverData(encodedData);

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0]).toEqual({ id: 0, x: 0, y: 0, label: 'A' });
    expect(result.nodes[1]).toEqual({ id: 1, x: 1, y: 0, label: 'B' });
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toEqual({ id: 0, source: 0, target: 1, label: 'f' });
  });

  it('不正なBase64データでエラーをスローする', () => {
    const invalidData = 'not-valid-base64!!!';
    
    expect(() => decodeQuiverData(invalidData)).toThrow();
  });

  it('不正なJSONフォーマットでエラーをスローする', () => {
    const invalidJson = Buffer.from('not json', 'utf-8').toString('base64');
    
    expect(() => decodeQuiverData(invalidJson)).toThrow();
  });

  it('不正なQuiverフォーマットでエラーをスローする', () => {
    // 配列ではない
    const data = { nodes: [], edges: [] };
    const encodedData = Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');
    
    expect(() => decodeQuiverData(encodedData)).toThrow();
  });
});

describe('validateDiagramData', () => {
  it('有効な図式データを検証できる', () => {
    const data: DiagramData = {
      nodes: [
        { id: 0, x: 0, y: 0, label: 'A' },
        { id: 1, x: 1, y: 0, label: 'B' }
      ],
      edges: [
        { id: 0, source: 0, target: 1, label: 'f' }
      ]
    };

    expect(validateDiagramData(data)).toBe(true);
  });

  it('ノードIDの重複を検出する', () => {
    const data: DiagramData = {
      nodes: [
        { id: 0, x: 0, y: 0, label: 'A' },
        { id: 0, x: 1, y: 0, label: 'B' } // 重複ID
      ],
      edges: []
    };

    expect(validateDiagramData(data)).toBe(false);
  });

  it('存在しないノードを参照するエッジを検出する', () => {
    const data: DiagramData = {
      nodes: [
        { id: 0, x: 0, y: 0, label: 'A' }
      ],
      edges: [
        { id: 0, source: 0, target: 999 } // 存在しないノード
      ]
    };

    expect(validateDiagramData(data)).toBe(false);
  });

  it('エッジIDの重複を検出する', () => {
    const data: DiagramData = {
      nodes: [
        { id: 0, x: 0, y: 0, label: 'A' },
        { id: 1, x: 1, y: 0, label: 'B' }
      ],
      edges: [
        { id: 0, source: 0, target: 1 },
        { id: 0, source: 1, target: 0 } // 重複ID
      ]
    };

    expect(validateDiagramData(data)).toBe(false);
  });
});
