# 要件定義書

## はじめに

Qutilsは、Quiver（可換図式作成ツール）で作成した図式を、Zennの記事に簡単に埋め込むためのユーティリティツールです。現在、Zennの記事執筆では可換図式を埋め込む手段がないため、手動でスクリーンショットを撮影し、画像としてアップロードする必要があります。Qutilsは、QuiverのURLから自動的に図式の画像を生成することで、この手間を軽減します。

## 用語集

- **Quiver**: 可換図式を描くためのWebベースのツール（q.uiver.app）
- **Qutils**: QuiverのURLから図式画像を生成するユーティリティツール（本システム）
- **Zenn**: 技術記事を執筆・公開するプラットフォーム
- **可換図式**: 数学における図式表現の一種
- **Base64 URLエンコード**: QuiverのURLに含まれる図式データのエンコード形式
- **マークダウンファイル**: Zennの記事を記述するためのテキストファイル
- **QuiverのURL**: `https://q.uiver.app/#q=...`の形式を持つURL
- **SVG**: Scalable Vector Graphics、ベクター形式の画像フォーマット
- **PNG**: Portable Network Graphics、ラスター形式の画像フォーマット
- **content-type**: 記事の種類を示す識別子（`article`または`book`）
- **article-slug**: articlesディレクトリ内の記事のファイル名から取得されるスラグ
- **book-slug**: booksディレクトリ内の本のディレクトリ名から取得されるスラグ
- **page-slug**: booksディレクトリ内のページのファイル名から取得されるスラグ
- **image-title**: 図式の内容を表す一意な識別子
- **マークダウンリンク形式**: 画像をクリック可能なリンクとして表示するマークダウン構文（`[![代替テキスト](画像パス)](リンク先URL)`）。Qutilsが処理済みのURLや、手動で作成された画像リンクがこの形式を取る
- **外部URL**: HTTPまたはHTTPSで始まる絶対URL（例: `https://storage.googleapis.com/zenn-user-upload/...`）。手動でアップロードされた画像を指す。主にZennの画像アップローダー（`https://storage.googleapis.com/zenn-user-upload/`）を通じてアップロードされた画像を想定しているが、任意の外部ホスティングサービスのURLも含む
- **ローカルパス**: 相対パスまたは絶対パス形式のファイルパス（例: `./images/diagram.svg`、`/images/diagram.svg`）。Qutilsが生成した画像を指す

## 要件

### 要件1

**ユーザーストーリー:** 記事執筆者として、マークダウンファイル内のQuiverのURLから自動的に図式画像を生成したい。これにより、手動でスクリーンショットを撮る手間を省きたい。

#### 受入基準

1. WHEN マークダウンファイルが保存される THEN Qutils SHALL ファイル内のすべてのQuiverのURLを検出する
2. WHEN QuiverのURLが検出される THEN Qutils SHALL そのURLから図式データを抽出する
3. WHEN 図式データが抽出される THEN Qutils SHALL 図式データをSVG画像として生成する
4. WHEN SVG画像が生成される THEN Qutils SHALL 生成された画像をファイルシステムに保存する
5. WHEN 画像が保存される THEN Qutils SHALL マークダウンファイル内のQuiverのURLを画像参照に置き換える

### 要件2

**ユーザーストーリー:** 記事執筆者として、生成された画像ファイルを適切な命名規則で管理したい。これにより、複数の記事で画像を整理しやすくしたい。

#### 受入基準

1. WHEN 画像ファイルが生成される THEN Qutils SHALL プロジェクトルートのimagesフォルダに画像を保存する
2. WHEN 画像ファイルが生成される THEN Qutils SHALL ファイル名を`{content-type}-{slug}-{image-title}.png`の形式で命名する
3. WHEN content-typeが決定される THEN Qutils SHALL マークダウンファイルのディレクトリ名（articlesまたはbooks）からcontent-typeを判定する
4. WHEN slugが決定される THEN Qutils SHALL マークダウンファイル名またはメタデータからslugを取得する
5. WHEN booksディレクトリ内のファイルが処理される THEN Qutils SHALL slugを`{book-slug}-{page-slug}`の形式で生成する
6. WHEN image-titleが決定される THEN Qutils SHALL 図式の内容を表す一意な識別子を生成する
7. WHEN 同じslugとimage-titleで複数の画像が生成される THEN Qutils SHALL ファイル名に連番を追加して一意性を確保する

### 要件3

**ユーザーストーリー:** 記事執筆者として、QuiverのURLから図式データを正確に解析したい。これにより、正しい図式画像を生成したい。

#### 受入基準

1. WHEN QuiverのURLが処理される THEN Qutils SHALL URLのフラグメント部分からBase64エンコードされたデータを抽出する
2. WHEN Base64データが抽出される THEN Qutils SHALL データをデコードして図式の構造情報を取得する
3. WHEN 図式データが不正な形式である THEN Qutils SHALL エラーメッセージを出力し、処理を中断する
4. WHEN URLが不正な形式である THEN Qutils SHALL エラーメッセージを出力し、そのURLをスキップする

### 要件4

**ユーザーストーリー:** 記事執筆者として、VSCodeでファイル保存時に自動的に画像生成を実行したい。これにより、執筆フローを中断せずに図式を埋め込みたい。

#### 受入基準

1. WHEN VSCodeでマークダウンファイルが保存される THEN Qutils SHALL 自動的に実行される
2. WHEN Qutilsが実行される THEN Qutils SHALL ファイル内のQuiverのURLを検出し、画像生成処理を開始する
3. WHEN 画像生成処理が完了する THEN Qutils SHALL マークダウンファイルを更新する
4. WHEN 処理中にエラーが発生する THEN Qutils SHALL エラー内容をユーザーに通知する

### 要件5

**ユーザーストーリー:** 記事執筆者として、既に画像が生成されているQuiverのURLを再処理したくない。これにより、不要な処理を避け、パフォーマンスを向上させたい。

#### 受入基準

1. WHEN QuiverのURLが検出される THEN Qutils SHALL 対応する画像ファイルが既に存在するか確認する
2. WHEN 画像ファイルが既に存在し、URLが変更されていない THEN Qutils SHALL 画像生成処理をスキップする
3. WHEN 画像ファイルが存在するが、URLが変更されている THEN Qutils SHALL 画像を再生成する
4. WHEN 画像ファイルが存在しない THEN Qutils SHALL 新しい画像を生成する
5. WHEN QuiverのURLが既にマークダウンリンク形式（`[![...](image-path)](quiver-url)`）に置き換えられている THEN Qutils SHALL リンク内のQuiverのURLを抽出する
6. WHEN マークダウンリンク形式の画像パスが外部URL（例: `https://storage.googleapis.com/zenn-user-upload/...`）である THEN Qutils SHALL その画像を手動で作成されたものとみなし、処理をスキップする
7. WHEN マークダウンリンク形式の画像パスがローカルパス（例: `./images/...`）であり、画像ファイルが存在し、URLの内容が変更されていない THEN Qutils SHALL 画像生成処理をスキップする
8. WHEN マークダウンリンク形式の画像パスがローカルパスであり、画像ファイルが存在するが、URLの内容が変更されている THEN Qutils SHALL 画像を再生成し、マークダウンを更新する
9. WHEN マークダウンリンク形式の画像パスがローカルパスであり、画像ファイルが存在しない THEN Qutils SHALL 新しい画像を生成し、マークダウンを更新する

### 要件6

**ユーザーストーリー:** 記事執筆者として、生成された画像の品質と可読性を確保したい。これにより、記事内で図式が明瞭に表示されるようにしたい。

#### 受入基準

1. WHEN SVG画像が生成される THEN Qutils SHALL 図式のすべての要素（ノード、エッジ、ラベル）を含める
2. WHEN SVG画像が生成される THEN Qutils SHALL 適切なサイズと解像度で画像を出力する
3. WHEN 図式に数式が含まれる THEN Qutils SHALL 数式を正しくレンダリングする
4. WHEN SVG画像が生成される THEN Qutils SHALL Zennのマークダウンレンダラーと互換性のある形式で出力する

### 要件7

**ユーザーストーリー:** 開発者として、複数のプログラミング言語から実装を選択したい。これにより、プロジェクトの要件や開発環境に応じた最適な言語を使用したい。

#### 受入基準

1. WHEN 実装言語が選択される THEN Qutils SHALL Kotlin、TypeScript、Rust、Bashのいずれかで実装される
2. WHEN 実装が完了する THEN Qutils SHALL 選択された言語で完全に動作する
3. WHEN 実装が完了する THEN Qutils SHALL すべての要件を満たす
