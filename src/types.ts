/**
 * コアデータ型定義
 * Quiver Image Generatorのすべての型を定義
 */

// 生のURL文字列（例: "https://q.uiver.app/#q=..."）
export type Url = string;

// ファイルパス文字列
export type FilePath = string;

// 解析済みのQuiverのURL
// マークダウンファイル内での位置情報を保持
export type QuiverUrl = {
  readonly url: Url;                  // 元のURL文字列
  readonly encodedData: string;       // URLから抽出されたBase64データ
  readonly position: {                // マークダウンファイル内の位置
    readonly start: number;
    readonly end: number;
  };
};

// ノード（オブジェクト）
export type Node = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly label: string;
};

// エッジのスタイル
export type EdgeStyle = {
  readonly bodyName?: string;        // 線のスタイル
  readonly headName?: string;        // 矢印の形状
  readonly offset?: number;
};

// エッジ（射）
export type Edge = {
  readonly id: number;
  readonly source: number;           // 始点ノードのID
  readonly target: number;           // 終点ノードのID
  readonly label?: string;
  readonly style?: EdgeStyle;
};

// 図式データ（デコード済み）
export type DiagramData = {
  readonly nodes: ReadonlyArray<Node>;
  readonly edges: ReadonlyArray<Edge>;
  readonly metadata?: {
    readonly width?: number;
    readonly height?: number;
  };
};

// 画像生成戦略と入力の型レベル関連付け
// 初期実装ではBrowserStrategyのみを使用
export type BrowserStrategy = {
  readonly strategy: 'browser';
  readonly input: Url;
};

// 将来の拡張用（初期実装では使用しない）
export type DirectStrategy = {
  readonly strategy: 'direct';
  readonly input: DiagramData;
};

export type TexStrategy = {
  readonly strategy: 'tex';
  readonly input: DiagramData;
};

// 画像生成の設定（初期実装ではBrowserStrategyのみ）
export type ImageGenerationConfig = BrowserStrategy;

// キャッシュエントリ
export type CacheEntry = {
  readonly url: Url;
  readonly encodedData: string;
  readonly imagePath: string;
  readonly timestamp: number;
};

// エラー型
export type UrlParseError = {
  readonly type: 'url-parse-error';
  readonly url: Url;
  readonly message: string;
};

export type DecodeError = {
  readonly type: 'decode-error';
  readonly data: string;
  readonly message: string;
};

export type ImageGenerationError = {
  readonly type: 'image-generation-error';
  readonly config: ImageGenerationConfig;
  readonly message: string;
};

export type FileIoError = {
  readonly type: 'file-io-error';
  readonly path: string;
  readonly message: string;
};

export type QutilsError = UrlParseError | DecodeError | ImageGenerationError | FileIoError;
