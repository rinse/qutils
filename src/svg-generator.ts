/**
 * SVG生成機能
 * QuiverのURLからSVG画像を生成する
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import type { Url, SvgGenerationConfig, SvgGenerationError } from './types';

/**
 * ブラウザインスタンスのキャッシュ
 * 複数のSVG生成リクエストで再利用するため
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
 * QuiverのページからSVGを生成
 * 
 * Quiverはcanvasベースのレンダリングを使用しているため、
 * スクリーンショットを撮影してSVGラッパーで包む
 * 
 * 注: 理想的にはQuiverのネイティブSVGエクスポート機能を使用すべきだが、
 * Quiverの内部APIが不安定なため、スクリーンショットアプローチを採用
 * 
 * @param page - Puppeteerのページインスタンス
 * @returns SVG文字列（PNG画像を埋め込んだSVG）
 * @throws ページからSVGを生成できない場合
 */
const extractSvgFromPage = async (page: Page): Promise<string> => {
  // ページが完全にロードされるまで待機
  await page.waitForSelector('.cell', { timeout: 15000 });

  // 追加の待機時間を設けて、レンダリングが完了するのを待つ
  await page.waitForTimeout(1000);

  // UI要素を非表示にするCSSを注入
  await page.addStyleTag({
    content: `
      #welcome-pane, .toolbar, .grid { display: none !important; }
      /* 背景を透明にするためにbodyとhtmlの背景をクリア */
      body, html { background: transparent !important; }
    `,
  });

  // 図式のバウンディングボックスを計算
  const clip = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.cell'));
    if (cells.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    cells.forEach((cell: Element) => {
      const rect = cell.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    const padding = 20; // 余白
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2),
    };
  });

  if (!clip) {
    throw new Error('No diagram cells found on Quiver page');
  }

  // バウンディングボックスに基づいてスクリーンショットを撮影
  // omitBackground: true で背景を透明にする
  const screenshot = await page.screenshot({
    clip: clip,
    omitBackground: true,
    encoding: 'base64',
  });

  // PNG画像を埋め込んだSVGを生成
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${Math.ceil(clip.width)}" height="${Math.ceil(clip.height)}" 
     viewBox="0 0 ${Math.ceil(clip.width)} ${Math.ceil(clip.height)}">
  <image width="${Math.ceil(clip.width)}" height="${Math.ceil(clip.height)}" 
         xlink:href="data:image/png;base64,${screenshot}"/>
</svg>`;

  return svg;
};

/**
 * ブラウザを使用してQuiverからSVGを取得
 * Puppeteerを使用してQuiverのページにアクセスし、レンダリングされたSVGを抽出
 * 
 * @param url - QuiverのURL
 * @returns SVG文字列
 * @throws SVG生成に失敗した場合
 * 
 * 要件: 1.3, 6.1, 6.3
 */
export const generateSvgFromBrowser = async (url: Url): Promise<string> => {
  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // ダウンロード動作を設定
    const client = await page.createCDPSession();
    const downloadPath = process.cwd() + '/temp-downloads';
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    // Quiverのページにアクセス
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // SVGを抽出
    const svg = await extractSvgFromPage(page);

    return svg;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw {
      type: 'svg-generation-error',
      config: { strategy: 'browser', input: url },
      message: `Failed to generate SVG from browser: ${message}`,
    } as SvgGenerationError;
  } finally {
    // ページをクローズ（ブラウザは再利用のため開いたまま）
    if (page) {
      await page.close();
    }
  }
};

/**
 * 設定に基づいてSVGを生成
 * 初期実装ではBrowserStrategyのみをサポート
 * 
 * @param config - SVG生成の設定
 * @returns SVG文字列
 * @throws SVG生成に失敗した場合
 * 
 * 要件: 1.3
 */
export const generateSvg = async (config: SvgGenerationConfig): Promise<string> => {
  // 初期実装ではBrowserStrategyのみ
  // SvgGenerationConfig = BrowserStrategyなので、常にこの分岐に入る
  return generateSvgFromBrowser(config.input);
};
