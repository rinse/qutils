/**
 * エラー通知機能のテスト
 */

import { describe, it, expect } from 'vitest';
import { formatErrorMessage, formatGenericError, getErrorMessage } from './error-notification';
import type { QutilsError } from './types';

describe('formatErrorMessage', () => {
  it('URL解析エラーのメッセージをフォーマットする', () => {
    const error: QutilsError = {
      type: 'url-parse-error',
      url: 'https://invalid-url',
      message: 'Invalid URL format',
    };

    const message = formatErrorMessage(error);

    expect(message).toContain('URL解析エラー');
    expect(message).toContain('Invalid URL format');
    expect(message).toContain('https://invalid-url');
    expect(message).toContain('対処法');
  });

  it('デコードエラーのメッセージをフォーマットする', () => {
    const error: QutilsError = {
      type: 'decode-error',
      data: 'invalid-base64',
      message: 'Failed to decode Base64 data',
    };

    const message = formatErrorMessage(error);

    expect(message).toContain('デコードエラー');
    expect(message).toContain('Failed to decode Base64 data');
    expect(message).toContain('対処法');
  });

  it('SVG生成エラーのメッセージをフォーマットする', () => {
    const error: QutilsError = {
      type: 'image-generation-error',
      config: {
        strategy: 'browser',
        input: 'https://q.uiver.app/#q=test',
      },
      message: 'Browser failed to start',
    };

    const message = formatErrorMessage(error);

    expect(message).toContain('画像生成エラー');
    expect(message).toContain('Browser failed to start');
    expect(message).toContain('対処法');
  });

  it('ファイルI/Oエラーのメッセージをフォーマットする', () => {
    const error: QutilsError = {
      type: 'file-io-error',
      path: '/path/to/file.svg',
      message: 'Permission denied',
    };

    const message = formatErrorMessage(error);

    expect(message).toContain('ファイルI/Oエラー');
    expect(message).toContain('Permission denied');
    expect(message).toContain('/path/to/file.svg');
    expect(message).toContain('対処法');
  });
});

describe('formatGenericError', () => {
  it('一般的なエラーのメッセージをフォーマットする', () => {
    const error = new Error('Something went wrong');

    const message = formatGenericError(error);

    expect(message).toContain('予期しないエラー');
    expect(message).toContain('Something went wrong');
    expect(message).toContain('対処法');
  });
});

describe('getErrorMessage', () => {
  it('QutilsErrorの場合は適切なメッセージを返す', () => {
    const error: QutilsError = {
      type: 'url-parse-error',
      url: 'https://invalid-url',
      message: 'Invalid URL format',
    };

    const message = getErrorMessage(error);

    expect(message).toContain('URL解析エラー');
    expect(message).toContain('対処法');
  });

  it('Error型の場合は一般的なメッセージを返す', () => {
    const error = new Error('Test error');

    const message = getErrorMessage(error);

    expect(message).toContain('予期しないエラー');
    expect(message).toContain('Test error');
  });

  it('その他の型の場合は汎用メッセージを返す', () => {
    const error = 'string error';

    const message = getErrorMessage(error);

    expect(message).toContain('予期しないエラー');
    expect(message).toContain('string error');
  });
});
