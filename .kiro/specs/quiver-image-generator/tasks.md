# 実装計画

- [x] 1. プロジェクト構造とコア型定義のセットアップ
  - TypeScriptプロジェクトの初期化（package.json、tsconfig.json）
  - VSCode拡張機能の基本構造を作成
  - コアデータ型を定義（Url、QuiverUrl、DiagramData、Node、Edge、EdgeStyle、BrowserStrategy、SvgGenerationConfig、エラー型）
  - _要件: 7.1, 7.2_

- [-] 2. URL解析機能の実装
- [x] 2.1 URL解析関数の実装
  - `parseQuiverUrl`関数を実装（URLからBase64データを抽出）
  - `extractQuiverUrls`関数を実装（マークダウンからすべてのQuiverのURLを検出）
    * 通常のURL形式とマークダウンリンク形式（`[![...](image)](url)`）の両方から抽出
  - `isExternalImageUrl`関数を実装（画像パスが外部URLかどうかを判定）
  - `isUrlReplaced`関数を実装（URLが既にマークダウンリンク形式に置き換えられているか確認）
    * 外部URLの場合は常にスキップ
    * ローカルパスの場合は画像ファイルの存在確認とURLの内容変更チェック
  - _要件: 1.1, 3.1, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 2.2 URL検出の完全性プロパティテスト
  - **Property 1: URL検出の完全性**
  - **検証対象: 要件 1.1**

- [x] 2.3 データ抽出の成功プロパティテスト
  - **Property 2: データ抽出の成功**
  - **検証対象: 要件 1.2, 3.1**

- [x] 2.4 不正URLのスキッププロパティテスト
  - **Property 11: 不正URLのスキップ**
  - **検証対象: 要件 3.4**

- [x] 3. デコード機能の実装
- [x] 3.1 デコード関数の実装
  - `decodeQuiverData`関数を実装（Base64データをデコードしてDiagramDataに変換）
  - `validateDiagramData`関数を実装（図式データの妥当性を検証）
  - _要件: 3.2_

- [x] 3.2 デコードの往復一貫性プロパティテスト
  - **Property 3: デコードの往復一貫性**
  - **検証対象: 要件 3.2**

- [x] 3.3 不正データのエラー処理プロパティテスト
  - **Property 10: 不正データのエラー処理**
  - **検証対象: 要件 3.3**

- [x] 4. ブラウザベースSVG生成機能の実装
- [x] 4.1 ブラウザ自動化の実装
  - Puppeteerをセットアップ
  - `generateSvgFromBrowser`関数の基本実装（QuiverのURLにアクセス）
  - ブラウザの起動、ページアクセスのロジックを実装
  - _要件: 1.3, 6.1, 6.3_

- [x] 4.2 SVG生成のメイン関数
  - `generateSvg`関数を実装（SvgGenerationConfigを受け取り、適切な戦略を呼び出す）
  - _要件: 1.3_

- [x] 4.7 generateSvgFromBrowserの改善
  - Welcomeメッセージを完全に非表示にする
  - UIコントロール（Save、Undo、ツールバーなど）を非表示にする
  - グリッドを非表示にする
  - 純粋なSVGまたは最適化されたPNG画像を取得する
  - ファイルサイズを削減する（現在の実装は約104KBで大きすぎる）
  - _要件: 1.3, 6.1, 6.3, 6.4_
  - ChatGPTの調査記録（参考）
    * https://chatgpt.com/s/dr_6921d496be5c8191865a07bb381565de

- [ ]* 4.3 SVG生成の成功プロパティテスト
  - **Property 4: SVG生成の成功**
  - **検証対象: 要件 1.3**

- [ ]* 4.4 SVG要素の完全性プロパティテスト
  - **Property 16: SVG要素の完全性**
  - **検証対象: 要件 6.1**

- [ ]* 4.5 数式レンダリングの包含プロパティテスト
  - **Property 17: 数式レンダリングの包含**
  - **検証対象: 要件 6.3**

- [ ]* 4.6 SVG形式の妥当性プロパティテスト
  - **Property 18: SVG形式の妥当性**
  - **検証対象: 要件 6.4**

- [ ] 5. ファイル操作機能の実装
- [x] 5.1 ファイル操作関数の実装
  - `savePngToFile`関数を実装（PNGをファイルに保存）
  - `generateImageFileName`関数を実装（content-type、slug、image-titleに基づいてファイル名を生成）
    * articlesディレクトリ: `article-{article-slug}-{image-title}.png`
    * booksディレクトリ: `book-{book-slug}-{page-slug}-{image-title}.png`
    * 同じファイル名が存在する場合は連番を追加
  - `generateImageTitle`関数を実装（図式データからimage-titleを生成）
  - `extractContentType`関数を実装（マークダウンファイルからcontent-typeを判定）
  - `extractSlug`関数を実装（マークダウンファイルからslugを抽出）
    * articlesディレクトリ: ファイル名から取得
    * booksディレクトリ: ディレクトリ名とファイル名を組み合わせて取得
  - `replaceUrlWithImageRef`関数を実装（マークダウン内のURLを画像参照に置き換え）
    * 画像をクリックするとQuiverのページに飛ぶようにリンクを追加
    * 形式: `[![diagram](imagePath)](quiverUrl)`
  - `fileExists`関数を実装（ファイルの存在確認）
  - `listImageFiles`関数を実装（imagesディレクトリ内の既存ファイル一覧を取得）
  - _要件: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 5.7 imagesディレクトリの位置と命名規則の更新
  - `file-operations.ts`の`generateImageFileName`関数を更新
    * content-typeとslugを引数として受け取るように変更
    * articlesディレクトリ: `article-{article-slug}-{image-title}.png`
    * booksディレクトリ: `book-{book-slug}-{page-slug}-{image-title}.png`
  - `file-operations.ts`に`extractContentType`関数を実装
    * マークダウンファイルのパスから`articles`または`books`を判定
  - `file-operations.ts`の`extractSlug`関数を更新
    * articlesディレクトリ: ファイル名から取得
    * booksディレクトリ: `{book-slug}-{page-slug}`の形式で生成
  - `process-url.ts`の`processMarkdownFile`関数を更新
    * imagesディレクトリをプロジェクトルートに変更（`path.join(workspaceRoot, 'images')`）
    * `processSingleUrl`の呼び出しにcontent-typeとslugを渡すように変更
  - `process-url.ts`の`processSingleUrl`関数を更新
    * content-typeとslugを引数として受け取るように変更
    * `generateImageFileName`の呼び出しを新しいシグネチャに合わせて更新
  - `extension.ts`を更新
    * ワークスペースルートのパスを`processMarkdownFile`に渡すように変更
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5.2 ファイル保存の成功プロパティテスト
  - **Property 5: ファイル保存の成功**
  - **検証対象: 要件 1.4**

- [x] 5.3 URL置換の正確性プロパティテスト
  - **Property 6: URL置換の正確性**
  - **検証対象: 要件 1.5**

- [x] 5.4 ファイル名形式の遵守プロパティテスト
  - **Property 7: ファイル名形式の遵守**
  - **検証対象: 要件 2.2**

- [x] 5.5 slug抽出の成功プロパティテスト
  - **Property 8: slug抽出の成功**
  - **検証対象: 要件 2.4**

- [x] 5.6 ファイル名の一意性プロパティテスト
  - **Property 9: ファイル名の一意性**
  - **検証対象: 要件 2.7**

- [ ]* 5.8 更新された命名規則のテスト
  - `file-operations.test.ts`の既存テストを更新
    * `generateImageFileName`のテストをcontent-typeとslugを含む新しい形式に対応
    * `extractContentType`のテストを追加（articlesとbooksの判定）
    * `extractSlug`のテストを更新（booksディレクトリの`{book-slug}-{page-slug}`形式に対応）
  - `process-url.test.ts`の既存テストを更新
    * プロジェクトルートのimagesディレクトリを使用するように変更
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. キャッシュ管理機能の実装
- [x] 6.1 キャッシュ操作関数の実装
  - `getCacheEntry`関数を実装（キャッシュからエントリを取得）
  - `addCacheEntry`関数を実装（キャッシュにエントリを追加）
  - `hasUrlChanged`関数を実装（URLが変更されたか確認）
  - キャッシュの永続化（ファイルシステムへの保存・読み込み）
  - _要件: 5.1, 5.2, 5.3_

- [x] 6.2 キャッシュヒットの検出プロパティテスト
  - **Property 12: キャッシュヒットの検出**
  - **検証対象: 要件 5.1**

- [x] 6.3 同一URLのスキッププロパティテスト
  - **Property 13: 同一URLのスキップ**
  - **検証対象: 要件 5.2**

- [x] 6.4 URL変更時の再生成プロパティテスト
  - **Property 14: URL変更時の再生成**
  - **検証対象: 要件 5.3**

- [x] 6.5 マークダウンリンク形式URLの処理プロパティテスト
  - **Property 15: マークダウンリンク形式URLの処理**
  - **検証対象: 要件 5.5, 5.6, 5.7, 5.8, 5.9**

- [ ] 7. メイン処理ロジックの実装
- [x] 7.1 単一URL処理関数の実装
  - `processSingleUrl`関数を実装（単一のQuiverUrlを処理してSVGを生成）
  - キャッシュチェック、SVG生成、ファイル保存を統合
  - _要件: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3_

- [x] 7.2 マークダウンファイル処理関数の実装
  - `processMarkdownFile`関数を実装（マークダウンファイル全体を処理）
  - URL抽出、各URLの処理、マークダウンの更新を統合
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 8. VSCode拡張機能の統合
- [x] 8.1 ファイル監視の実装
  - VSCodeのファイル保存イベントをリッスン
  - マークダウンファイルが保存されたときに`processMarkdownFile`を呼び出す
  - _要件: 4.1, 4.2_

- [x] 8.2 エラー通知の実装
  - エラーが発生したときにVSCodeの通知を表示
  - エラーメッセージに問題の原因と対処法を含める
  - _要件: 4.4_

- [x] 8.3 拡張機能のパッケージング
  - package.jsonに拡張機能のメタデータを追加
  - アクティベーションイベントを設定
  - 拡張機能をビルドしてテスト
  - _要件: 7.2, 7.3_

- [x] 9. チェックポイント - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

- [ ]* 10. 統合テストの作成
  - 実際のQuiverのURLを使用したエンドツーエンドテスト
  - 複数のURLを含むマークダウンファイルのテスト
  - キャッシュ機能の動作確認テスト
  - _要件: すべて_

- [x] 11. ドキュメントの作成
  - README.mdに使用方法を記載
  - 設定オプションの説明
  - トラブルシューティングガイド
  - _要件: すべて_
