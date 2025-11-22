/**
 * VSCode拡張機能のエントリーポイント
 * Quiver Image Generatorの初期化と起動処理
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { processMarkdownFile } from './process-url';
import { loadCache, saveCache } from './cache';
import type { CacheEntry, SvgGenerationConfig } from './types';
import { showErrorNotification, showSuccessNotification } from './error-notification';

/**
 * キャッシュファイルのパスを取得
 *
 * @param workspaceFolder - ワークスペースフォルダ
 * @returns キャッシュファイルのパス
 */
const getCacheFilePath = (workspaceFolder: vscode.WorkspaceFolder): string => {
  return path.join(workspaceFolder.uri.fsPath, '.qutils', 'cache.json');
};

/**
 * マークダウンファイルを処理する
 *
 * この関数は以下の処理を行います：
 * 1. キャッシュを読み込む
 * 2. マークダウンファイルを処理（QuiverのURLを検出してSVGを生成）
 * 3. キャッシュを保存
 *
 * @param document - 処理するドキュメント
 */
const handleMarkdownSave = async (document: vscode.TextDocument): Promise<void> => {
  // マークダウンファイルでない場合はスキップ
  if (document.languageId !== 'markdown') {
    return;
  }

  // ワークスペースフォルダを取得
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    console.warn('Qutils: No workspace folder found for document');
    return;
  }

  try {
    // キャッシュを読み込む
    const cacheFilePath = getCacheFilePath(workspaceFolder);
    const cache: ReadonlyArray<CacheEntry> = await loadCache(cacheFilePath);

    // SVG生成の設定（ブラウザベース戦略を使用）
    const config: SvgGenerationConfig = {
      strategy: 'browser',
      input: '', // processSingleUrlで各URLに対して設定される
    };

    // マークダウンファイルを処理
    const result = await processMarkdownFile(
      document.uri.fsPath,
      config,
      cache,
    );

    // キャッシュを保存
    await saveCache(cacheFilePath, result.updatedCache);

    // 生成された画像がある場合は通知
    if (result.generatedImages.length > 0) {
      showSuccessNotification(
        `${result.generatedImages.length}個の画像をQuiverのURLから生成しました`,
      );
    }
  } catch (error) {
    // エラーが発生した場合は詳細な通知を表示
    // 要件: 4.4
    showErrorNotification(error);
  }
};

/**
 * 拡張機能がアクティベートされたときに呼ばれる
 *
 * この関数は以下の処理を行います：
 * 1. ファイル保存イベントのリスナーを登録
 * 2. マークダウンファイルが保存されたときにhandleMarkdownSaveを呼び出す
 *
 * 要件: 4.1, 4.2
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Qutils: Quiver Image Generator is now active');

  // ファイル保存イベントのリスナーを登録
  // onDidSaveTextDocumentは、ドキュメントが保存された後に発火する
  const disposable = vscode.workspace.onDidSaveTextDocument(handleMarkdownSave);

  // コンテキストにdisposableを追加（拡張機能が非アクティブ化されたときにクリーンアップされる）
  context.subscriptions.push(disposable);
}

/**
 * 拡張機能が非アクティベートされたときに呼ばれる
 */
export function deactivate() {
  console.log('Qutils: Quiver Image Generator is now deactivated');
}
