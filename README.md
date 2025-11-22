# Qutils

QuiverのURLから可換図式のSVG画像を自動生成し、Zennのマークダウンに埋め込むVSCode拡張機能。

## 概要

[Quiver](https://q.uiver.app)は可換図式を描くためのWebツールです。Zennの記事執筆では可換図式を直接埋め込む手段がないため、現在は手動でスクリーンショットを撮影し、画像としてアップロードする必要があります。

Qutilsは、VSCodeでマークダウンファイルを保存する際に、ファイル内のQuiverのURLを自動検出し、対応するSVG画像を生成して画像参照に置き換えます。

## 主な機能

- **自動画像生成**: マークダウンファイル保存時にQuiverのURLからSVG画像を自動生成
- **キャッシュ機能**: 同じURLの重複処理を回避し、パフォーマンスを向上
- **エラー処理**: 不正なURLやデータを適切に処理し、エラーを通知
- **ファイル管理**: `{slug}-{image-description}.svg`形式で画像を整理

## インストール

### 前提条件

- VSCode 1.80.0以上
- Node.js 18.0以上
- Chromiumブラウザ（Puppeteerが自動インストール）

### インストール手順

1. **拡張機能のインストール**
   ```bash
   # リポジトリをクローン
   git clone https://github.com/yourusername/qutils.git
   cd qutils
   
   # 依存関係をインストール
   npm install
   
   # 拡張機能をビルド
   npm run compile
   ```

2. **VSCodeに拡張機能をインストール**
   - VSCodeで `F1` を押してコマンドパレットを開く
   - `Extensions: Install from VSIX...` を選択
   - ビルドされた `.vsix` ファイルを選択

3. **拡張機能の有効化**
   - マークダウンファイルを開くと自動的に有効化されます

## 使い方

### 基本的な使い方

1. **Quiverで図式を作成**
   - [Quiver](https://q.uiver.app)にアクセス
   - 可換図式を作成
   - URLをコピー（例: `https://q.uiver.app/#q=WzAsOCxbMCwxLCJUKFQoQSkpIl0...`）

2. **マークダウンファイルに貼り付け**
   ```markdown
   [](https://q.uiver.app/#q=WzAsOCxbMCwxLCJUKFQoQSkpIl0...)
   ```

3. **ファイルを保存**
   - `Ctrl+S` (Windows/Linux) または `Cmd+S` (Mac) でファイルを保存
   - Qutilsが自動的にURLを検出し、SVG画像を生成
   - URLが画像参照に置き換わります

4. **結果の確認**
   ```markdown
   [![diagram](./images/my-article-diagram-001.svg)](https://q.uiver.app/#q=WzAsOCxbMCwxLCJUKFQoQSkpIl0...)
   ```
   - 画像をクリックするとQuiverのページに遷移します

### ファイル構造

Qutilsは以下のディレクトリ構造で画像を保存します：

```
your-project/
├── articles/
│   └── my-article.md          # マークダウンファイル
└── images/
    ├── my-article-diagram-001.svg
    ├── my-article-diagram-002.svg
    └── ...
```

### ファイル命名規則

生成される画像ファイル名は `{slug}-{image-description}.svg` の形式です：

- **slug**: マークダウンファイル名から自動抽出（例: `my-article.md` → `my-article`）
- **image-description**: 図式データから生成される一意な識別子

### キャッシュ機能

Qutilsは処理済みのURLをキャッシュします：

- **同じURLの再処理を回避**: 既に画像が生成されている場合はスキップ
- **URL変更の検出**: URLのデータ部分が変更された場合は自動的に再生成
- **パフォーマンス向上**: 大量のURLを含むファイルでも高速に処理

## 動作例

マークダウンファイルに以下のようなQuiverのURLを記述：

```markdown
[](https://q.uiver.app/#q=WzAsOCxbMCwxLCJUKFQoQSkpIl0sWzAsMCwiXFxtYXRoYmYgQyJdLFsxLDEsIlQoQSkiXSxbMSwyLCJBIl0sWzAsMiwiVChBKSJdLFsyLDEsIkEiXSxbMywxLCJUKEEpIl0sWzMsMiwiQSJdLFsyLDMsImYiXSxbMCwyLCJcXG11X0EiXSxbMCw0LCJUKGYpIiwyXSxbNCwzLCJmIiwyXSxbMCwzLCJcXGNpcmNsZWFycm93cmlnaHQiLDEseyJzdHlsZSI6eyJib2R5Ijp7Im5hbWUiOiJub25lIn0sImhlYWQiOnsibmFtZSI6Im5vbmUifX19XSxbNSw2LCJcXGV0YV9BIl0sWzYsNywiZiJdLFs1LDcsIlxcbWF0aHJte2lkfV9BIiwyXSxbNSw3LCJcXGNpcmNsZWFycm93cmlnaHQiLDEseyJvZmZzZXQiOi0zLCJzdHlsZSI6eyJib2R5Ijp7Im5hbWUiOiJub25lIn0sImhlYWQiOnsibmFtZSI6Im5vbmUifX19XV0=)
```

ファイルを保存すると、自動的に以下のように置き換わります：

```markdown
[![diagram](./images/my-article-diagram-001.svg)](https://q.uiver.app/#q=WzAsOCxbMCwxLCJUKFQoQSkpIl0sWzAsMCwiXFxtYXRoYmYgQyJdLFsxLDEsIlQoQSkiXSxbMSwyLCJBIl0sWzAsMiwiVChBKSJdLFsyLDEsIkEiXSxbMywxLCJUKEEpIl0sWzMsMiwiQSJdLFsyLDMsImYiXSxbMCwyLCJcXG11X0EiXSxbMCw0LCJUKGYpIiwyXSxbNCwzLCJmIiwyXSxbMCwzLCJcXGNpcmNsZWFycm93cmlnaHQiLDEseyJzdHlsZSI6eyJib2R5Ijp7Im5hbWUiOiJub25lIn0sImhlYWQiOnsibmFtZSI6Im5vbmUifX19XSxbNSw2LCJcXGV0YV9BIl0sWzYsNywiZiJdLFs1LDcsIlxcbWF0aHJte2lkfV9BIiwyXSxbNSw3LCJcXGNpcmNsZWFycm93cmlnaHQiLDEseyJvZmZzZXQiOi0zLCJzdHlsZSI6eyJib2R5Ijp7Im5hbWUiOiJub25lIn0sImhlYWQiOnsibmFtZSI6Im5vbmUifX19XV0=)
```

## アーキテクチャ

```
VSCode拡張機能 → URLパーサー → デコーダー → SVGジェネレーター → ファイル管理
```

### SVG生成戦略

初期実装では**ブラウザベース戦略**を採用：
- Puppeteerを使用してQuiverのページにアクセス
- レンダリングされたSVGを取得
- Quiverの全機能を完全にサポート

将来的には以下の戦略も実装予定：
- **直接生成**: 図式データから直接SVG要素を構築
- **TeXベース**: TeXレンダラーを使用して高品質な数式レンダリング

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: VSCode Extension API
- **ブラウザ自動化**: Puppeteer
- **テスト**: Vitest + fast-check（プロパティベーステスト）

## プロジェクト構造

```
qutils/
├── src/
│   ├── types.ts              # データ型定義
│   ├── parser.ts             # URL解析
│   ├── decoder.ts            # Base64デコード
│   ├── generator.ts          # SVG生成
│   ├── fileManager.ts        # ファイル操作
│   ├── cache.ts              # キャッシュ管理
│   └── extension.ts          # VSCode拡張機能エントリポイント
├── tests/
│   ├── unit/                 # ユニットテスト
│   └── properties/           # プロパティベーステスト
├── .kiro/specs/              # 仕様書
│   └── quiver-image-generator/
│       ├── requirements.md   # 要件定義
│       ├── design.md         # 設計書
│       └── tasks.md          # 実装計画
└── package.json
```

## 開発

### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/qutils.git
cd qutils

# 依存関係をインストール
npm install

# TypeScriptをコンパイル
npm run compile

# テストを実行
npm test

# リントを実行
npm run lint
```

### テストの実行

Qutilsは2種類のテストを使用しています：

1. **ユニットテスト**: 個別の関数やコンポーネントをテスト
2. **プロパティベーステスト**: fast-checkを使用して、正確性プロパティを検証

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npx vitest --run src/url-parser.test.ts

# ウォッチモードでテストを実行（開発時）
npx vitest
```

### 開発状況

現在、コア機能の実装が完了しました。実装を確認・改善するには：

1. `.kiro/specs/quiver-image-generator/tasks.md`を開く
2. 各タスクの横にある「Start task」をクリック
3. タスク1から順番に実装を進める

### コントリビューション

プルリクエストを歓迎します！以下の手順でコントリビュートしてください：

1. このリポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを作成

### コーディング規約

- **関数型プログラミング**: イミュータブルなデータ構造と純粋関数を優先
- **型安全性**: TypeScriptの型システムを最大限活用
- **テスト**: 新機能には必ずテストを追加
- **ドキュメント**: 公開APIには必ずJSDocコメントを追加

## 仕様書

詳細な仕様は以下のドキュメントを参照：

- [要件定義書](.kiro/specs/quiver-image-generator/requirements.md) - 7つの要件と受入基準
- [設計書](.kiro/specs/quiver-image-generator/design.md) - アーキテクチャ、データ型、17個の正確性プロパティ
- [実装計画](.kiro/specs/quiver-image-generator/tasks.md) - 11個の実装タスク

## 設定オプション

現在、Qutilsは設定ファイルなしで動作しますが、将来的には以下の設定オプションを追加予定です：

### 計画中の設定項目

```json
{
  "qutils.imageDirectory": "./images",
  "qutils.svgGenerationStrategy": "browser",
  "qutils.cacheEnabled": true,
  "qutils.browserTimeout": 30000,
  "qutils.autoProcess": true
}
```

- **imageDirectory**: 画像の保存先ディレクトリ（デフォルト: `./images`）
- **svgGenerationStrategy**: SVG生成戦略（`browser`, `direct`, `tex`）
- **cacheEnabled**: キャッシュ機能の有効/無効
- **browserTimeout**: ブラウザ処理のタイムアウト時間（ミリ秒）
- **autoProcess**: ファイル保存時の自動処理の有効/無効

### 現在の動作

初期実装では以下のデフォルト設定で動作します：

- 画像保存先: `./images/`
- SVG生成戦略: ブラウザベース（Puppeteer）
- キャッシュ: 有効
- ブラウザタイムアウト: 30秒
- 自動処理: 有効

## トラブルシューティング

### よくある問題と解決方法

#### 1. 画像が生成されない

**症状**: ファイルを保存してもURLが画像参照に置き換わらない

**原因と解決方法**:
- **URLの形式が不正**: QuiverのURLが `https://q.uiver.app/#q=...` の形式であることを確認
- **ネットワーク接続**: インターネット接続を確認（ブラウザベース戦略はQuiverのページにアクセスが必要）
- **Puppeteerのインストール**: `npm install` を再実行してPuppeteerが正しくインストールされているか確認

#### 2. エラー通知が表示される

**症状**: VSCodeに「SVG生成エラー」などの通知が表示される

**原因と解決方法**:
- **Base64デコードエラー**: URLのデータ部分が破損している可能性があります。Quiverで図式を再作成してURLを取得し直してください
- **ブラウザ起動エラー**: Chromiumのインストールに失敗している可能性があります。以下を実行：
  ```bash
  npx puppeteer browsers install chrome
  ```
- **タイムアウトエラー**: 複雑な図式の場合、処理に時間がかかることがあります。しばらく待ってから再試行してください

#### 3. 画像が正しく表示されない

**症状**: 生成された画像が空白または不完全

**原因と解決方法**:
- **SVGファイルの確認**: 生成された `.svg` ファイルをブラウザで直接開いて内容を確認
- **Quiverの図式を確認**: 元のQuiverのURLをブラウザで開いて、図式が正しく表示されるか確認
- **キャッシュのクリア**: 古いキャッシュが原因の可能性があります。画像ファイルを削除して再生成してください

#### 4. 同じURLが何度も処理される

**症状**: キャッシュが効いていない

**原因と解決方法**:
- **URLの微妙な違い**: URLの末尾にスペースや改行が含まれていないか確認
- **キャッシュファイルの破損**: `.qutils-cache.json` ファイルを削除して再生成

#### 5. ファイル保存が遅い

**症状**: マークダウンファイルの保存に時間がかかる

**原因と解決方法**:
- **複数のURLを含むファイル**: 初回処理時は各URLに対してブラウザを起動するため時間がかかります。2回目以降はキャッシュにより高速化されます
- **ブラウザの起動オーバーヘッド**: ブラウザベース戦略の制約です。将来的に直接生成戦略を実装することで改善予定

#### 6. VSCodeの拡張機能が有効化されない

**症状**: マークダウンファイルを開いても拡張機能が動作しない

**原因と解決方法**:
- **拡張機能のインストール確認**: VSCodeの拡張機能一覧で「Qutils」が有効になっているか確認
- **VSCodeの再起動**: VSCodeを再起動してください
- **ログの確認**: VSCodeの開発者ツール（`Help` > `Toggle Developer Tools`）でコンソールログを確認

### デバッグ方法

問題が解決しない場合は、以下の手順でデバッグ情報を収集してください：

1. **VSCode開発者ツールを開く**
   - `Help` > `Toggle Developer Tools`

2. **コンソールログを確認**
   - エラーメッセージやスタックトレースを確認

3. **拡張機能のログを確認**
   - 出力パネル（`View` > `Output`）で「Qutils」を選択

4. **問題を報告**
   - GitHubのIssueに以下の情報を含めて報告：
     - エラーメッセージ
     - 使用しているQuiverのURL（可能であれば）
     - VSCodeのバージョン
     - OSの種類とバージョン

## ライセンス

MIT

