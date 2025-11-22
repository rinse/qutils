/**
 * デコーダー関数のテスト
 */

import { describe, it, expect } from 'vitest';
import { decodeQuiverData, encodeQuiverData, validateDiagramData } from './decoder';
import type { DiagramData, Node, Edge, EdgeStyle } from './types';
import * as fc from 'fast-check';

describe('decodeQuiverData', () => {
  it('有効なQuiverデータをデコードできる', () => {
    // Quiverのフォーマット: [version, nodeCount, [node1], [node2], ..., [edge1], [edge2], ...]
    // nodes: [x, y, label]
    // edges: [source, target, label?, options?]
    const data = [
      0, // version
      2, // nodeCount
      [0, 0, 'A'], // node 0
      [1, 0, 'B'], // node 1
      [0, 1, 'f']  // edge 0
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

/**
 * **Feature: quiver-image-generator, Property 3: デコードの往復一貫性**
 * **検証対象: 要件 3.2**
 * 
 * 任意の図式データに対して、エンコードしてからデコードすると、
 * 元のデータと等価なデータが得られるべきである
 */
describe('Property 3: デコードの往復一貫性', () => {
  // EdgeStyleのArbitrary
  const edgeStyleArb = fc.record({
    bodyName: fc.option(fc.string(), { nil: undefined }),
    headName: fc.option(fc.string(), { nil: undefined }),
    offset: fc.option(fc.integer(), { nil: undefined }),
  }).map(style => {
    // 空のオブジェクトの場合はundefinedを返す
    if (style.bodyName === undefined && style.headName === undefined && style.offset === undefined) {
      return undefined;
    }
    return style as EdgeStyle;
  });

  // Nodeのジェネレーター
  const nodeArb = (id: number) => fc.record({
    id: fc.constant(id),
    x: fc.integer({ min: -1000, max: 1000 }),
    y: fc.integer({ min: -1000, max: 1000 }),
    label: fc.string({ minLength: 0, maxLength: 50 }),
  });

  // Edgeのジェネレーター（ノード数に基づいて有効なsource/targetを生成）
  const edgeArb = (id: number, nodeCount: number): fc.Arbitrary<Edge | null> => {
    // nodeCountが0の場合はエッジを生成できない
    if (nodeCount === 0) {
      return fc.constant(null);
    }

    return fc.record({
      id: fc.constant(id),
      source: fc.integer({ min: 0, max: nodeCount - 1 }),
      target: fc.integer({ min: 0, max: nodeCount - 1 }),
      label: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      style: edgeStyleArb,
    }) as fc.Arbitrary<Edge>;
  };

  // DiagramDataのジェネレーター
  const diagramDataArb: fc.Arbitrary<DiagramData> = fc.integer({ min: 0, max: 10 }).chain(nodeCount => {
    // nodeCountが0の場合は空の配列を生成
    const nodesArb: fc.Arbitrary<readonly Node[]> = nodeCount === 0
      ? fc.constant([])
      : fc.array(
          fc.integer({ min: 0, max: nodeCount - 1 }).chain(id => nodeArb(id)),
          { minLength: nodeCount, maxLength: nodeCount }
        ).map(nodes => {
          // IDを0から順に振り直す
          return nodes.map((node, index) => ({ ...node, id: index }));
        });

    const edgesArb: fc.Arbitrary<readonly Edge[]> = fc.array(
      fc.integer({ min: 0, max: 20 }).chain(id => edgeArb(id, nodeCount)),
      { minLength: 0, maxLength: 20 }
    ).map(edges => {
      // nullを除外してIDを振り直す
      return edges
        .filter((edge): edge is Edge => edge !== null)
        .map((edge, index) => ({ ...edge, id: index }));
    });

    return fc.record({
      nodes: nodesArb,
      edges: edgesArb,
    }) as fc.Arbitrary<DiagramData>;
  });

  it('任意の図式データに対してエンコード→デコードの往復一貫性が保たれる', () => {
    fc.assert(
      fc.property(diagramDataArb, (originalData: DiagramData) => {
        // エンコード
        const encoded = encodeQuiverData(originalData);

        // デコード
        const decoded = decodeQuiverData(encoded);

        // 往復一貫性の検証
        expect(decoded.nodes).toHaveLength(originalData.nodes.length);
        expect(decoded.edges).toHaveLength(originalData.edges.length);

        // ノードの比較
        for (let i = 0; i < originalData.nodes.length; i++) {
          const original = originalData.nodes[i];
          const result = decoded.nodes[i];

          expect(result.id).toBe(original.id);
          expect(result.x).toBe(original.x);
          expect(result.y).toBe(original.y);
          expect(result.label).toBe(original.label);
        }

        // エッジの比較
        for (let i = 0; i < originalData.edges.length; i++) {
          const original = originalData.edges[i];
          const result = decoded.edges[i];

          expect(result.id).toBe(original.id);
          expect(result.source).toBe(original.source);
          expect(result.target).toBe(original.target);
          expect(result.label).toBe(original.label);

          // styleの比較（undefinedの場合も考慮）
          if (original.style === undefined) {
            expect(result.style).toBeUndefined();
          } else {
            expect(result.style).toBeDefined();
            expect(result.style?.bodyName).toBe(original.style.bodyName);
            expect(result.style?.headName).toBe(original.style.headName);
            expect(result.style?.offset).toBe(original.style.offset);
          }
        }
      }),
      { numRuns: 100 } // 100回の反復を実行
    );
  });
});
