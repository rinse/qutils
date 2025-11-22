/**
 * VSCode拡張機能のエントリーポイント
 * Quiver Image Generatorの初期化と起動処理
 */

import * as vscode from 'vscode';

/**
 * 拡張機能がアクティベートされたときに呼ばれる
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Qutils: Quiver Image Generator is now active');

  // TODO: ファイル保存イベントのリスナーを追加
  // TODO: マークダウンファイルの処理を実装
}

/**
 * 拡張機能が非アクティベートされたときに呼ばれる
 */
export function deactivate() {
  console.log('Qutils: Quiver Image Generator is now deactivated');
}
