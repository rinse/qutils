/**
 * エラー通知機能
 * VSCodeの通知を使用してユーザーにエラーを報告
 */

import * as vscode from 'vscode';
import type { QutilsError } from './types';

/**
 * エラーメッセージをフォーマットする
 * 問題の原因と対処法を含む詳細なメッセージを生成
 *
 * @param error - QutilsError型のエラー
 * @returns フォーマットされたエラーメッセージ
 */
export const formatErrorMessage = (error: QutilsError): string => {
  switch (error.type) {
  case 'url-parse-error':
    return `URL解析エラー: ${error.message}\n` +
        `URL: ${error.url}\n` +
        `対処法: QuiverのURLが正しい形式（https://q.uiver.app/#q=...）であることを確認してください。`;

  case 'decode-error':
    return `デコードエラー: ${error.message}\n` +
        `対処法: QuiverのURLが破損していないか確認してください。Quiverで図式を再度エクスポートしてみてください。`;

  case 'svg-generation-error':
    return `SVG生成エラー: ${error.message}\n` +
        `対処法: ブラウザが正しく起動できるか確認してください。ネットワーク接続を確認し、Quiverのサイト（q.uiver.app）にアクセスできることを確認してください。`;

  case 'file-io-error':
    return `ファイルI/Oエラー: ${error.message}\n` +
        `パス: ${error.path}\n` +
        `対処法: ファイルの書き込み権限があることを確認してください。ディスク容量が十分にあることを確認してください。`;
  }
};

/**
 * 一般的なエラーメッセージをフォーマットする
 * QutilsError型でないエラーの場合に使用
 *
 * @param error - Error型のエラー
 * @returns フォーマットされたエラーメッセージ
 */
export const formatGenericError = (error: Error): string => {
  return `予期しないエラーが発生しました: ${error.message}\n` +
    `対処法: 問題が解決しない場合は、拡張機能を再起動してみてください。`;
};

/**
 * エラーメッセージを取得する
 * エラーオブジェクトから適切なメッセージを生成
 *
 * @param error - エラーオブジェクト（QutilsErrorまたはError）
 * @returns フォーマットされたエラーメッセージ
 */
export const getErrorMessage = (error: unknown): string => {
  if (isQutilsError(error)) {
    return formatErrorMessage(error);
  } else if (error instanceof Error) {
    return formatGenericError(error);
  } else {
    return `予期しないエラーが発生しました: ${String(error)}\n` +
      `対処法: 問題が解決しない場合は、拡張機能を再起動してみてください。`;
  }
};

/**
 * エラー通知を表示する
 * VSCodeのエラー通知を使用してユーザーに詳細なエラー情報を提供
 *
 * @param error - エラーオブジェクト（QutilsErrorまたはError）
 */
export const showErrorNotification = (error: unknown): void => {
  const message = getErrorMessage(error);
  vscode.window.showErrorMessage(`Qutils: ${message}`);
  console.error('Qutils: Error details:', error);
};

/**
 * 警告通知を表示する
 * 処理を続行できるが、ユーザーに注意を促す必要がある場合に使用
 *
 * @param message - 警告メッセージ
 */
export const showWarningNotification = (message: string): void => {
  vscode.window.showWarningMessage(`Qutils: ${message}`);
  console.warn('Qutils:', message);
};

/**
 * 成功通知を表示する
 *
 * @param message - 成功メッセージ
 */
export const showSuccessNotification = (message: string): void => {
  vscode.window.showInformationMessage(`Qutils: ${message}`);
};

/**
 * 型ガード: QutilsError型かどうかを判定
 *
 * @param error - 判定対象のエラー
 * @returns QutilsError型の場合はtrue
 */
const isQutilsError = (error: unknown): error is QutilsError => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const e = error as Record<string, unknown>;
  return (
    e.type === 'url-parse-error' ||
    e.type === 'decode-error' ||
    e.type === 'svg-generation-error' ||
    e.type === 'file-io-error'
  );
};
