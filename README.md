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

## 開発状況

現在、仕様策定フェーズが完了しました。実装を開始するには：

1. `.kiro/specs/quiver-image-generator/tasks.md`を開く
2. 各タスクの横にある「Start task」をクリック
3. タスク1から順番に実装を進める

## 仕様書

詳細な仕様は以下のドキュメントを参照：

- [要件定義書](.kiro/specs/quiver-image-generator/requirements.md) - 7つの要件と受入基準
- [設計書](.kiro/specs/quiver-image-generator/design.md) - アーキテクチャ、データ型、17個の正確性プロパティ
- [実装計画](.kiro/specs/quiver-image-generator/tasks.md) - 11個の実装タスク

## ライセンス

TBD

