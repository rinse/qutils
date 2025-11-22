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
  let style: EdgeStyle = {};

  if ('body' in opts && typeof opts.body === 'object' && opts.body !== null) {
    const body = opts.body as Record<string, unknown>;
    if ('name' in body && typeof body.name === 'string') {
      style = { ...style, bodyName: body.name };
    }
  }

  if ('head' in opts && typeof opts.head === 'object' && opts.head !== null) {
    const head = opts.head as Record<string, unknown>;
    if ('name' in head && typeof head.name === 'string') {
      style = { ...style, headName: head.name };
    }
  }

  if ('offset' in opts && typeof opts.offset === 'number') {
    style = { ...style, offset: opts.offset };
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

  // labelの処理
  const parsedLabel = (() => {
    if (label === undefined) {
      return undefined;
    }
    if (typeof label !== 'string') {
      throw new Error(`Edge at index ${index} has invalid label`);
    }
    // 空文字列の場合はundefinedとして扱う（Quiverのフォーマットでは空文字列はプレースホルダー）
    return label !== '' ? label : undefined;
  })();

  // styleの処理
  const parsedStyle = parseEdgeStyle(options);

  // イミュータブルなオブジェクトを構築
  return {
    id: index,
    source,
    target,
    ...(parsedLabel !== undefined && { label: parsedLabel }),
    ...(parsedStyle !== undefined && { style: parsedStyle }),
  };
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
 * DiagramDataをQuiverのフォーマットにエンコードしてBase64文字列に変換
 *
 * @param data - エンコードする図式データ
 * @returns Base64エンコードされた図式データ
 */
export const encodeQuiverData = (data: DiagramData): string => {
  // Quiverのフォーマット: [version, nodeCount, [node1], [node2], ..., [edge1], [edge2], ...]
  const version = 0;
  const nodeCount = data.nodes.length;

  // ノードを配列形式に変換: [x, y, label]
  const nodesArray = data.nodes.map(node => [node.x, node.y, node.label]);

  // エッジを配列形式に変換: [source, target, label?, options?]
  const edgesArray = data.edges.map(edge => {
    const edgeArray: unknown[] = [edge.source, edge.target];

    // styleのオプションを構築
    let options: Record<string, unknown> | undefined = undefined;
    if (edge.style !== undefined) {
      const opts: Record<string, unknown> = {};

      if (edge.style.bodyName !== undefined) {
        opts.body = { name: edge.style.bodyName };
      }

      if (edge.style.headName !== undefined) {
        opts.head = { name: edge.style.headName };
      }

      if (edge.style.offset !== undefined) {
        opts.offset = edge.style.offset;
      }

      // optionsが空でない場合のみ設定
      if (Object.keys(opts).length > 0) {
        options = opts;
      }
    }

    // labelがある場合（空文字列でない場合）は追加
    if (edge.label !== undefined && edge.label !== '') {
      edgeArray.push(edge.label);
      if (options !== undefined) {
        edgeArray.push(options);
      }
    } else if (options !== undefined) {
      // labelがないがoptionsがある場合は空文字列をプレースホルダーとして追加
      edgeArray.push('');
      edgeArray.push(options);
    }

    return edgeArray;
  });

  // 全体を配列にまとめる
  const quiverData = [version, nodeCount, ...nodesArray, ...edgesArray];

  // JSONに変換してBase64エンコード
  const jsonString = JSON.stringify(quiverData);
  return Buffer.from(jsonString, 'utf-8').toString('base64');
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
