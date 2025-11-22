/**
 * デコード機能
 * Base64エンコードされたQuiverデータをDiagramDataに変換
 */

import { DiagramData, Node, Edge, EdgeStyle, DecodeError } from './types';

/**
 * QuiverのデータフォーマットからNodeを構築
 * Quiverの配列形式: [x, y, label, options?]
 */
const parseNode = (nodeData: unknown, index: number): Node => {
  if (!Array.isArray(nodeData)) {
    throw new Error(`Node at index ${index} is not an array`);
  }

  const [x, y, label] = nodeData;

  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error(`Node at index ${index} has invalid coordinates`);
  }

  if (typeof label !== 'string') {
    throw new Error(`Node at index ${index} has invalid label`);
  }

  return {
    id: index,
    x,
    y,
    label,
  };
};

/**
 * QuiverのデータフォーマットからEdgeStyleを構築
 */
const parseEdgeStyle = (options: unknown): EdgeStyle | undefined => {
  if (!options || typeof options !== 'object') {
    return undefined;
  }

  const opts = options as Record<string, unknown>;
  const style: EdgeStyle = {};

  if ('body' in opts && typeof opts.body === 'object' && opts.body !== null) {
    const body = opts.body as Record<string, unknown>;
    if ('name' in body && typeof body.name === 'string') {
      return { ...style, bodyName: body.name };
    }
  }

  if ('head' in opts && typeof opts.head === 'object' && opts.head !== null) {
    const head = opts.head as Record<string, unknown>;
    if ('name' in head && typeof head.name === 'string') {
      return { ...style, headName: head.name };
    }
  }

  if ('offset' in opts && typeof opts.offset === 'number') {
    return { ...style, offset: opts.offset };
  }

  return Object.keys(style).length > 0 ? style : undefined;
};

/**
 * QuiverのデータフォーマットからEdgeを構築
 * Quiverの配列形式: [source, target, label?, options?]
 */
const parseEdge = (edgeData: unknown, index: number): Edge => {
  if (!Array.isArray(edgeData)) {
    throw new Error(`Edge at index ${index} is not an array`);
  }

  const [source, target, label, options] = edgeData;

  if (typeof source !== 'number' || typeof target !== 'number') {
    throw new Error(`Edge at index ${index} has invalid source or target`);
  }

  const edge: Edge = {
    id: index,
    source,
    target,
  };

  if (label !== undefined && label !== '') {
    if (typeof label !== 'string') {
      throw new Error(`Edge at index ${index} has invalid label`);
    }
    return { ...edge, label };
  }

  const style = parseEdgeStyle(options);
  if (style !== undefined) {
    return { ...edge, style };
  }

  return edge;
};

/**
 * Base64エンコードされたデータをデコードしてDiagramDataに変換
 *
 * @param encodedData - Base64エンコードされた図式データ
 * @returns デコードされた図式データ
 * @throws DecodeError - デコードに失敗した場合
 */
export const decodeQuiverData = (encodedData: string): DiagramData => {
  try {
    // Base64デコード
    const jsonString = Buffer.from(encodedData, 'base64').toString('utf-8');

    // JSONパース
    const parsed = JSON.parse(jsonString);

    // Quiverのフォーマット: [version, nodeCount, [node1], [node2], ..., [edge1], [edge2], ...]
    if (!Array.isArray(parsed) || parsed.length < 2) {
      throw new Error('Invalid Quiver data format: expected array with at least 2 elements');
    }

    // 最初の2要素はメタデータ（version, nodeCount）
    const nodeCount = parsed[1] as number;

    if (typeof nodeCount !== 'number') {
      throw new Error('Invalid Quiver data format: second element must be node count');
    }

    // ノードデータは index 2 から nodeCount 個
    const nodesData = parsed.slice(2, 2 + nodeCount);

    // エッジデータは残りの要素
    const edgesData = parsed.slice(2 + nodeCount);

    // ノードをパース
    const nodes = nodesData.map((nodeData, index) => parseNode(nodeData, index));

    // エッジをパース
    const edges = edgesData.map((edgeData, index) => parseEdge(edgeData, index));

    return {
      nodes,
      edges,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const decodeError: DecodeError = {
      type: 'decode-error',
      data: encodedData,
      message: `Failed to decode Quiver data: ${message}`,
    };
    throw decodeError;
  }
};

/**
 * 図式データの妥当性を検証
 *
 * @param data - 検証する図式データ
 * @returns データが妥当な場合true、そうでない場合false
 */
export const validateDiagramData = (data: DiagramData): boolean => {
  // ノードの検証
  if (!Array.isArray(data.nodes)) {
    return false;
  }

  // 各ノードの検証
  const nodeIds = new Set<number>();
  for (const node of data.nodes) {
    if (typeof node.id !== 'number' ||
        typeof node.x !== 'number' ||
        typeof node.y !== 'number' ||
        typeof node.label !== 'string') {
      return false;
    }

    // IDの重複チェック
    if (nodeIds.has(node.id)) {
      return false;
    }
    nodeIds.add(node.id);
  }

  // エッジの検証
  if (!Array.isArray(data.edges)) {
    return false;
  }

  // 各エッジの検証
  const edgeIds = new Set<number>();
  for (const edge of data.edges) {
    if (typeof edge.id !== 'number' ||
        typeof edge.source !== 'number' ||
        typeof edge.target !== 'number') {
      return false;
    }

    // IDの重複チェック
    if (edgeIds.has(edge.id)) {
      return false;
    }
    edgeIds.add(edge.id);

    // sourceとtargetがノードIDとして存在するか確認
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return false;
    }

    // オプショナルフィールドの検証
    if (edge.label !== undefined && typeof edge.label !== 'string') {
      return false;
    }

    if (edge.style !== undefined) {
      const style = edge.style;
      if (style.bodyName !== undefined && typeof style.bodyName !== 'string') {
        return false;
      }
      if (style.headName !== undefined && typeof style.headName !== 'string') {
        return false;
      }
      if (style.offset !== undefined && typeof style.offset !== 'number') {
        return false;
      }
    }
  }

  // メタデータの検証（オプショナル）
  if (data.metadata !== undefined) {
    const metadata = data.metadata;
    if (metadata.width !== undefined && typeof metadata.width !== 'number') {
      return false;
    }
    if (metadata.height !== undefined && typeof metadata.height !== 'number') {
      return false;
    }
  }

  return true;
};
