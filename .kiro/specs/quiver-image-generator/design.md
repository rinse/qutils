# 設計書

## 概要

Qutilsは、QuiverのURLから可換図式のSVG画像を自動生成し、Zennのマークダウンファイルに埋め込むためのツールです。VSCodeでのファイル保存をトリガーとして、マークダウンファイル内のQuiverのURLを検出し、対応するSVG画像を生成して、画像参照に置き換えます。

## アーキテクチャ

システムは以下の主要コンポーネントで構成されます：

```
┌─────────────────┐
│  VSCode拡張機能  │
│  (ファイル監視)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  URLパーサー     │
│  (URL検出・抽出) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  デコーダー      │
│  (Base64デコード)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SVGジェネレーター│
│  (図式レンダリング)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ファイル管理    │
│  (保存・置換)    │
└─────────────────┘
```

実装言語として**TypeScript**を選択します。理由：
- VSCode拡張機能の開発に最適
- Node.jsエコシステムの豊富なライブラリ
- 型安全性による保守性の向上

## データ型とインターフェース

### データ型定義

```typescript
// 生のURL文字列（例: "https://q.uiver.app/#q=..."）
type Url = string;

// 解析済みのQuiverのURL
// マークダウンファイル内での位置情報を保持
type QuiverUrl = {
  readonly url: Url;                  // 元のURL文字列
  readonly encodedData: string;       // URLから抽出されたBase64データ
  readonly position: {                // マークダウンファイル内の位置
    readonly start: number;
    readonly end: number;
  };
};

// 図式データ（デコード済み）
type DiagramData = {
  readonly nodes: ReadonlyArray<Node>;
  readonly edges: ReadonlyArray<Edge>;
  readonly metadata?: {
    readonly width?: number;
    readonly height?: number;
  };
};

// ノード（オブジェクト）
type Node = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly label: string;
};

// エッジ（射）
type Edge = {
  readonly id: number;
  readonly source: number;           // 始点ノードのID
  readonly target: number;           // 終点ノードのID
  readonly label?: string;
  readonly style?: EdgeStyle;
};

// エッジのスタイル
type EdgeStyle = {
  readonly bodyName?: string;        // 線のスタイル
  readonly headName?: string;        // 矢印の形状
  readonly offset?: number;
};

// SVG生成戦略と入力の型レベル関連付け
// 初期実装ではBrowserStrategyのみを使用
type BrowserStrategy = {
  readonly strategy: 'browser';
  readonly input: Url;
};

// 将来の拡張用（初期実装では使用しない）
type DirectStrategy = {
  readonly strategy: 'direct';
  readonly input: DiagramData;
};

type TexStrategy = {
  readonly strategy: 'tex';
  readonly input: DiagramData;
};

// SVG生成の設定（初期実装ではBrowserStrategyのみ）
type SvgGenerationConfig = BrowserStrategy;
// 将来の拡張: type SvgGenerationConfig = DirectStrategy | TexStrategy | BrowserStrategy;

// キャッシュエントリ
type CacheEntry = {
  readonly url: Url;
  readonly encodedData: string;
  readonly imagePath: string;
  readonly timestamp: number;
};

// エラー型
type UrlParseError = {
  readonly type: 'url-parse-error';
  readonly url: Url;
  readonly message: string;
};

type DecodeError = {
  readonly type: 'decode-error';
  readonly data: string;
  readonly message: string;
};

type SvgGenerationError = {
  readonly type: 'svg-generation-error';
  readonly config: SvgGenerationConfig;
  readonly message: string;
};

type FileIoError = {
  readonly type: 'file-io-error';
  readonly path: string;
  readonly message: string;
};

type QutilsError = UrlParseError | DecodeError | SvgGenerationError | FileIoError;
```

## 関数インターフェース

システムは以下の関数で構成されます。エラーは例外としてスローされます。

### 1. URL解析関数

```typescript
// 生のURL文字列からQuiverUrlを構築
// URLが不正な形式の場合はUrlParseErrorをスロー
function parseQuiverUrl(url: Url, position: { start: number; end: number }): QuiverUrl;

// マークダウンコンテンツからQuiverのURLを抽出
// 不正なURLはスキップされ、有効なURLのみ返される
// マークダウンリンク形式（[![...](image)](url)）内のURLも抽出される
function extractQuiverUrls(content: string): ReadonlyArray<QuiverUrl>;

// 画像パスが外部URL（手動で作成された画像）かどうかを判定
// 外部URLはhttpまたはhttpsで始まるURL
// 主にZennの画像アップローダー（https://storage.googleapis.com/zenn-user-upload/）を想定
function isExternalImageUrl(imagePath: string): boolean;

// URLが既にマークダウンリンク形式に置き換えられているか確認
// マークダウンリンク形式の場合：
// - 画像パスが外部URLなら常にスキップ（手動で作成された画像）
// - 画像パスがローカルパスなら、ファイルの存在とURLの内容変更をチェック
function isUrlReplaced(content: string, url: QuiverUrl): boolean;
```

### 2. デコード関数

```typescript
// Base64エンコードされたデータをデコード
// デコードに失敗した場合はDecodeErrorをスロー
function decodeQuiverData(encodedData: string): DiagramData;

// 図式データの妥当性を検証
function validateDiagramData(data: DiagramData): boolean;
```

### 3. SVG生成関数

初期実装では、ブラウザベースの戦略のみを実装します：

```typescript
// ブラウザを使用してQuiverからSVGを取得
// 生成に失敗した場合はSvgGenerationErrorをスロー
function generateSvgFromBrowser(url: Url): Promise<string>;

// 設定に基づいてSVGを生成
// 初期実装ではBrowserStrategyのみをサポート
// 生成に失敗した場合はSvgGenerationErrorをスロー
function generateSvg(config: SvgGenerationConfig): Promise<string>;
```

将来の拡張用（初期実装では含まれない）：

```typescript
// 戦略1: 図式データから直接SVGを生成
function generateSvgDirect(data: DiagramData): Promise<string>;

// 戦略2: TeXレンダラーを使用してSVGを生成
function generateSvgFromTex(data: DiagramData): Promise<string>;
```

### 4. ファイル操作関数

```typescript
// SVGをファイルに保存
// 保存に失敗した場合はFileIoErrorをスロー
function saveSvgToFile(svg: string, filePath: string): Promise<void>;

// ファイル名を生成（一意な識別子を含む）
function generateImageFileName(slug: string, data: DiagramData): string;

// マークダウンファイルからslugを抽出
// ファイル名またはフロントマターのメタデータから取得
function extractSlug(markdownPath: string, content: string): string;

// マークダウンコンテンツ内のURLを画像参照に置き換え
function replaceUrlWithImageRef(
  content: string,
  url: QuiverUrl,
  imagePath: string
): string;

// ファイルが存在するか確認
function fileExists(filePath: string): Promise<boolean>;
```

### 5. キャッシュ操作関数

```typescript
// キャッシュからエントリを取得
function getCacheEntry(url: Url, cache: ReadonlyArray<CacheEntry>): CacheEntry | undefined;

// キャッシュにエントリを追加（イミュータブル）
function addCacheEntry(
  cache: ReadonlyArray<CacheEntry>,
  entry: CacheEntry
): ReadonlyArray<CacheEntry>;

// URLが変更されたか確認
function hasUrlChanged(url: Url, encodedData: string, cache: ReadonlyArray<CacheEntry>): boolean;
```

### 6. メイン処理関数

```typescript
// 単一のQuiverUrlを処理してSVGを生成
// 戦略に応じて適切な生成関数を呼び出す
function processSingleUrl(
  quiverUrl: QuiverUrl,
  config: SvgGenerationConfig,
  slug: string,
  cache: ReadonlyArray<CacheEntry>
): Promise<{
  readonly imagePath: string;
  readonly shouldReplace: boolean;  // キャッシュヒットの場合はfalse
}>;

// マークダウンファイルを処理
// すべてのQuiverUrlを検出し、SVGを生成し、ファイルを更新
function processMarkdownFile(
  filePath: string,
  config: SvgGenerationConfig,
  cache: ReadonlyArray<CacheEntry>
): Promise<{ 
  readonly updatedContent: string;
  readonly updatedCache: ReadonlyArray<CacheEntry>;
  readonly generatedImages: ReadonlyArray<string>;
}>;
```

## データモデル

### QuiverのURLフォーマット

QuiverのURLは以下の形式を持ちます：

```
https://q.uiver.app/#q=<Base64エンコードされたJSON>
```

Base64デコード後のJSONは以下の構造を持ちます：

```json
[
  [
    [x, y, "label"],
    ...
  ],
  [
    [sourceId, targetId, "label", options],
    ...
  ]
]
```

### ファイル構造

生成された画像は以下のディレクトリ構造で保存されます：

```
project-root/
├── articles/
│   └── my-article.md
└── images/
    └── my-article-diagram-001.svg
    └── my-article-diagram-002.svg
```


## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性または動作です。本質的には、システムが何をすべきかについての形式的な記述です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証との橋渡しとなります。*

### プロパティ1: URL検出の完全性

*任意の*マークダウンコンテンツに対して、ファイル内のすべてのQuiverのURL（`https://q.uiver.app/#q=...`の形式）が検出されるべきである
**検証対象: 要件 1.1**

### プロパティ2: データ抽出の成功

*任意の*有効なQuiverのURLに対して、URLのフラグメント部分からBase64エンコードされたデータが正しく抽出されるべきである
**検証対象: 要件 1.2, 3.1**

### プロパティ3: デコードの往復一貫性

*任意の*図式データに対して、エンコードしてからデコードすると、元のデータと等価なデータが得られるべきである
**検証対象: 要件 3.2**

### プロパティ4: SVG生成の成功

*任意の*有効な図式データまたはQuiverのURLに対して、選択された生成戦略を使用して有効なSVG文字列が生成されるべきである
**検証対象: 要件 1.3**

### プロパティ5: ファイル保存の成功

*任意の*SVG文字列とファイルパスに対して、保存後にそのパスにファイルが存在するべきである
**検証対象: 要件 1.4**

### プロパティ6: URL置換の正確性

*任意の*マークダウンコンテンツとQuiverのURLに対して、置換後のコンテンツには元のURLが含まれず、画像参照が含まれるべきである
**検証対象: 要件 1.5**

### プロパティ7: ファイル名形式の遵守

*任意の*slugと図式データに対して、生成されるファイル名は`{slug}-{image-description}.svg`の形式に一致するべきである
**検証対象: 要件 2.1**

### プロパティ8: slug抽出の成功

*任意の*マークダウンファイルパスまたはメタデータに対して、有効なslugが抽出されるべきである
**検証対象: 要件 2.2**

### プロパティ9: image-descriptionの一意性

*任意の*同じslugを持つ複数の異なる図式データに対して、生成されるすべてのimage-descriptionは互いに異なるべきである
**検証対象: 要件 2.4**

### プロパティ10: 不正データのエラー処理

*任意の*不正な形式の図式データに対して、デコード処理はエラーを返すべきである
**検証対象: 要件 3.3**

### プロパティ11: 不正URLのスキップ

*任意の*不正な形式のURLを含むマークダウンに対して、処理は失敗せず、不正なURLはスキップされるべきである
**検証対象: 要件 3.4**

### プロパティ12: キャッシュヒットの検出

*任意の*URLに対して、対応する画像ファイルが存在する場合、存在確認は真を返すべきである
**検証対象: 要件 5.1**

### プロパティ13: 同一URLのスキップ

*任意の*URLに対して、同じURLで2回処理を実行した場合、2回目は画像生成をスキップするべきである
**検証対象: 要件 5.2**

### プロパティ14: URL変更時の再生成

*任意の*URLに対して、URLのデータ部分が変更された場合、画像は再生成されるべきである
**検証対象: 要件 5.3**

### プロパティ15: マークダウンリンク形式URLの処理

*任意の*マークダウンリンク形式（`[![...](image-path)](quiver-url)`）のマークダウンに対して、以下が正しく動作するべきである：
1. リンク先のQuiverのURLが抽出される
2. 画像パスが外部URL（`https://`で始まる）の場合、処理がスキップされる（手動で作成された画像として扱う）
3. 画像パスがローカルパスの場合、画像ファイルの存在が確認される
4. ローカル画像が存在し、URLの内容が変更されていない場合、処理がスキップされる
5. ローカル画像が存在しない、またはURLの内容が変更されている場合、画像が生成される
**検証対象: 要件 5.5, 5.6, 5.7, 5.8, 5.9**

### プロパティ16: SVG要素の完全性

*任意の*図式データに対して、生成されたSVGには、すべてのノード、エッジ、ラベルに対応する要素が含まれるべきである
**検証対象: 要件 6.1**

### プロパティ17: 数式レンダリングの包含

*任意の*数式を含む図式データに対して、生成されたSVGには数式の表現が含まれるべきである
**検証対象: 要件 6.3**

### プロパティ18: SVG形式の妥当性

*任意の*生成されたSVGに対して、有効なXML形式であるべきである
**検証対象: 要件 6.4**

## エラー処理

### エラーの種類

1. **URLパースエラー**: 不正な形式のQuiverのURL
   - 処理: エラーログを出力し、そのURLをスキップ
   - ユーザーへの通知: 警告メッセージ

2. **デコードエラー**: Base64デコードの失敗または不正なJSON
   - 処理: エラーログを出力し、そのURLをスキップ
   - ユーザーへの通知: エラーメッセージ

3. **SVG生成エラー**: 図式データからSVG生成の失敗
   - 処理: エラーログを出力し、処理を中断
   - ユーザーへの通知: エラーメッセージ

4. **ファイルI/Oエラー**: ファイルの読み書きの失敗
   - 処理: エラーログを出力し、処理を中断
   - ユーザーへの通知: エラーメッセージ

### エラーハンドリング戦略

- すべてのエラーは適切にキャッチされ、ログに記録される
- 部分的なエラー（個別のURL処理の失敗）は全体の処理を中断しない
- 致命的なエラー（ファイルI/O）は処理を中断し、ユーザーに通知する
- エラーメッセージには、問題の原因と推奨される対処法を含める

## テスト戦略

### ユニットテスト

各コンポーネントの個別機能をテストします：

1. **URLパーサー**
   - 有効なQuiverのURLの検出
   - 複数のURLの検出
   - 不正なURLの処理

2. **デコーダー**
   - 有効なBase64データのデコード
   - 不正なデータのエラー処理

3. **SVGジェネレーター**
   - 基本的な図式のSVG生成
   - 数式を含む図式のSVG生成

4. **ファイル管理**
   - ファイル名生成
   - slug抽出
   - ファイル保存

5. **キャッシュ管理**
   - キャッシュの保存と取得
   - URL変更の検出

### プロパティベーステスト

プロパティベーステストには**fast-check**ライブラリを使用します。各テストは最低100回の反復を実行します。

各正確性プロパティは、対応するプロパティベーステストで実装されます：

1. **プロパティ1-17**: 上記の正確性プロパティセクションで定義された各プロパティに対して、1つのプロパティベーステストを実装
2. 各テストは、設計書のプロパティ番号を参照するコメントでタグ付けされる
3. タグ形式: `**Feature: quiver-image-generator, Property {number}: {property_text}**`

### 統合テスト

エンドツーエンドのワークフローをテストします：

1. マークダウンファイルの処理
2. 複数のURLを含むファイルの処理
3. キャッシュ機能の動作確認
4. VSCode拡張機能の統合

### テストデータ

テストには以下のデータを使用します：

1. **実際のQuiverのURL**: README.mdに記載されている実例
2. **合成データ**: ランダムに生成された図式データ
3. **エッジケース**: 空の図式、大規模な図式、特殊文字を含む図式

## 実装の詳細

### SVG生成戦略の選択

システムは3つのSVG生成戦略をサポートします：

#### 戦略1: 直接生成（Direct Generation）

図式データを解析し、SVG要素を直接構築します。

**利点:**
- 外部依存が少ない
- 高速な処理
- オフラインで動作

**欠点:**
- 複雑な図式の完全な再現が困難
- 数式レンダリングに追加のライブラリが必要

**使用ライブラリ:**
- **svg.js** または **d3.js**: SVG要素の生成
- **katex**: 数式レンダリング

#### 戦略2: TeXベース（TeX-based）

図式データをTeX形式（tikz-cdなど）に変換し、TeXレンダラーでSVGを生成します。

**利点:**
- 高品質な数式レンダリング
- 学術的な標準形式

**欠点:**
- TeXディストリビューションが必要
- 処理が比較的遅い

**使用ライブラリ:**
- **latex.js** または外部のTeX処理系（pdflatex + pdf2svg）

#### 戦略3: ブラウザベース（Browser-based）

Puppeteerなどを使用してQuiverのページにアクセスし、レンダリングされたSVGを取得またはスクリーンショットを撮影します。

**利点:**
- Quiverの完全な再現性
- 実装が比較的簡単
- すべての機能をサポート

**欠点:**
- ブラウザの起動オーバーヘッド
- ネットワーク接続が必要
- 処理が遅い

**使用ライブラリ:**
- **puppeteer** または **playwright**: ブラウザ自動化

### 実装方針

**初期実装（プロトタイプ）**では**戦略3（ブラウザベース）のみ**を実装します：
- 最も確実にQuiverの図式を再現できる
- 実装が比較的簡単
- Quiverの全機能をサポート

戦略1（直接生成）と戦略2（TeXベース）は、将来の拡張として設計に含めていますが、初期実装ではソースコード上に現れません。型システムによる抽象化により、後から追加の戦略を実装する際も既存コードの変更を最小限に抑えられます。

初期実装では、`SvgGenerationConfig`型は`BrowserStrategy`のみを使用します：

```typescript
// 初期実装で使用する設定型
type SvgGenerationConfig = BrowserStrategy;
```

将来的に他の戦略を追加する際は、ユニオン型を拡張します：

```typescript
// 将来の拡張
type SvgGenerationConfig = DirectStrategy | TexStrategy | BrowserStrategy;
```

### 使用するライブラリ

- **VSCode Extension API**: ファイル監視とイベント処理
- **fast-check**: プロパティベーステスト
- **vitest**: ユニットテストフレームワーク
- **puppeteer** または **playwright**: ブラウザ自動化（戦略3）
- **svg.js** または **d3.js**: SVG生成（戦略1）
- **katex**: 数式レンダリング（戦略1）

### パフォーマンス考慮事項

1. **キャッシュ**: URLと画像の対応をメモリとディスクにキャッシュ
2. **並列処理**: 複数のURLを並列に処理
3. **遅延実行**: ファイル保存後、短い遅延を設けて連続保存を集約

### セキュリティ考慮事項

1. **入力検証**: すべての外部入力（URL、ファイルパス）を検証
2. **パス検証**: ファイルパスがプロジェクトディレクトリ内であることを確認
3. **サイズ制限**: 処理する図式データのサイズに上限を設定

## 拡張性

将来的な拡張の可能性：

1. **他の図式ツールのサポート**: TikZ、Mermaidなど
2. **画像フォーマットの選択**: PNG、PDFなどの出力形式
3. **カスタマイズ可能なスタイル**: 色、フォント、サイズの設定
4. **バッチ処理**: 複数のファイルを一括処理
5. **プレビュー機能**: 生成前に図式をプレビュー
