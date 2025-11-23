/**
 * 画像生成機能の抽象化レイヤー
 * 戦略パターンを使用して、設定に基づいて適切な生成方法を選択
 */

import type { ImageGenerationConfig, FilePath } from './types';
import { generatePngFromBrowser } from './png-generator';

/**
 * 画像生成戦略のマップ
 * 戦略名から生成関数へのマッピング
 */
const strategies = {
  browser: generatePngFromBrowser,
  // 将来の拡張用
  // direct: generatePngFromDirect,
  // tex: generatePngFromTex,
} as const;

/**
 * 設定に基づいて画像を生成
 *
 * この関数は戦略パターンを実装し、configのstrategyフィールドに基づいて
 * 適切な生成関数に処理を委譲します。
 *
 * 画像は直接outputPathに書き込まれます（副作用）。
 *
 * @param config - 画像生成の設定（戦略を含む）
 * @param outputPath - 画像の出力先パス
 * @throws 画像生成に失敗した場合
 *
 * 要件: 1.3
 */
export const generateImage = async (
  config: ImageGenerationConfig,
  outputPath: FilePath,
): Promise<void> => {
  // 戦略に基づいて適切な生成関数を選択
  const generator = strategies[config.strategy];

  if (!generator) {
    throw new Error(`Unknown strategy: ${config.strategy}`);
  }

  await generator(config, outputPath);
};
