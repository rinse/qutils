/**
 * PNG生成機能（Browser戦略）
 * QuiverのURLからPNG画像を生成する
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { BrowserStrategy, ImageGenerationError, FilePath } from './types';

/**
 * ブラウザインスタンスのキャッシュ
 * 複数のPNG生成リクエストで再利用するため
 *
 * 必要性: Puppeteerのブラウザ起動には数秒かかるため、
 * 複数のリクエスト間でインスタンスを再利用することで
 * パフォーマンスを大幅に向上させる必要がある。
 * ブラウザインスタンスはステートレスであり、
 * 各リクエストは独立したページで処理されるため、
 * 共有しても問題ない。
 */
let browserInstance: Browser | null = null;

/**
 * ブラウザインスタンスを取得（既存のものを再利用または新規作成）
 *
 * @returns Puppeteerのブラウザインスタンス
 */
const getBrowser = async (): Promise<Browser> => {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=3840,2160', // 4K解像度で起動
    ],
  });

  return browserInstance;
};

/**
 * ブラウザインスタンスをクリーンアップ
 * 拡張機能の非アクティブ化時に呼び出される
 */
export const closeBrowser = async (): Promise<void> => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};

/**
 * QuiverのページからPNG画像データを抽出
 *
 * Quiverはcanvasベースのレンダリングを使用しているため、
 * スクリーンショットを撮影してPNG画像データとして返す
 *
 * @param page - Puppeteerのページインスタンス
 * @returns PNG画像データ（Buffer）
 * @throws ページからPNGを抽出できない場合
 */
const extractPngFromPage = async (page: Page): Promise<Buffer> => {
  // ページが完全にロードされるまで待機
  await page.waitForSelector('.cell', { timeout: 15000 });

  // Canvas要素のレンダリング完了を待つ
  // 複数回チェックして、レンダリングが安定するまで待機
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.width > 0 && canvas.height > 0;
    },
    { timeout: 15000 },
  );

  // 追加の待機時間を設けて、レンダリングが完了するのを待つ
  // TODO: レンダリング完了を検出するより洗練された方法を検討
  await new Promise(resolve => setTimeout(resolve, 2000));

  // UI要素を非表示にするCSSを注入
  await page.addStyleTag({
    content: `
      #welcome-pane, .toolbar, .grid { display: none !important; }
      /* 背景を透明にするためにbodyとhtmlの背景をクリア */
      body, html { background: transparent !important; }
    `,
  });

  // 選択状態を解除するために左上をクリック
  // カーソルはCanvas上に描画されるため、CSSでは消せない
  await page.mouse.click(0, 0);

  // 図式のバウンディングボックスを計算
  const clip = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.cell'));

    if (cells.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // .cell要素からバウンディングボックスを計算
    // 各セルの実際の内容（テキストや矢印）の範囲を取得
    cells.forEach((cell: Element) => {
      const rect = cell.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    // 最小限の余白（図式が切れないように）
    const padding = 20;
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2),
    };
  });

  if (!clip) {
    const error: ImageGenerationError = {
      type: 'image-generation-error',
      config: { strategy: 'browser', input: page.url() },
      message: 'No diagram cells found on Quiver page',
    };
    throw error;
  }

  // バウンディングボックスに基づいてスクリーンショットを撮影
  // omitBackground: true で背景を透明にする
  return await page.screenshot({
    clip: clip,
    omitBackground: true,
    encoding: 'binary',
  }) as Buffer;
};

/**
 * PNG画像データをファイルに保存
 *
 * @param imageData - PNG画像データ（Buffer）
 * @param outputPath - PNG画像の出力先パス
 * @throws ファイル保存に失敗した場合
 */
const savePngToFile = async (imageData: Buffer, outputPath: FilePath): Promise<void> => {
  // ディレクトリが存在しない場合は作成
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // PNG画像をファイルに保存
  await fs.writeFile(outputPath, imageData);
};

/**
 * ブラウザを使用してQuiverからPNGを生成
 * Puppeteerを使用してQuiverのページにアクセスし、レンダリングされたPNGを生成
 *
 * @param config - Browser戦略の設定
 * @param outputPath - PNG画像の出力先パス
 * @throws PNG生成に失敗した場合
 *
 * 要件: 1.3, 6.1, 6.3
 */
export const generatePngFromBrowser = async (
  config: BrowserStrategy,
  outputPath: FilePath,
): Promise<void> => {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // ビューポートサイズを大きく設定（大きな図式に対応）
    await page.setViewport({
      width: 3840,
      height: 2160,
      deviceScaleFactor: 2, // 高解像度でレンダリング
    });

    // ダウンロード動作を設定
    const client = await page.createCDPSession();
    const downloadPath = process.cwd() + '/temp-downloads';
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    // Quiverのページにアクセス
    await page.goto(config.input, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // PNGを抽出
    const imageData = await extractPngFromPage(page);

    // ファイルに保存
    await savePngToFile(imageData, outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw {
      type: 'image-generation-error',
      config,
      message: `Failed to generate PNG from browser: ${message}`,
    } as ImageGenerationError;
  } finally {
    // ページをクローズ（ブラウザは再利用のため開いたまま）
    if (page) {
      await page.close();
    }
  }
};
