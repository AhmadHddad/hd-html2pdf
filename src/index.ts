import puppeteer from 'puppeteer-core';
import {
  LaunchOptions,
  Page,
  PuppeteerLifeCycleEvent,
  Viewport,
  WaitForOptions,
  executablePath,
} from 'puppeteer';
import { addHttpToURL, isURL, joinObjects } from 'hd-utils';

export type HdHtml2PdfParams = {
  /**
   * @description url of a web page
   */
  url?: string;
  /**
   * @description page default width including how the web page is viewed
   * @default 1280
   */
  width?: number;
  /**
   * @description the width of the view port for the page, if small it will look like a mobile device.
   * @default 1280
   */
  viewPortWidth?: number;
  /**
   * @description the actual pdf width
   * @default 1280
   */
  pdfWidth?: number;
  /**
   * @description HTML string that will be converted to PDF
   */
  html?: string;
  /**
   * @description what type of emulation media, either a screen or print
   * @default screen
   */
  emulationMediaType?: 'screen' | 'print';
  /**
   * @description will get the puppeteer Page object
   */
  getPage?: (page: Page) => Promise<void>;
  /**
   * @description will wait until all of the passed events are successful.
   * @default networkidle0
   */
  waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
  /**
   * @description http headers that will be passed to the web page.
   */
  httpHeaders?: Record<string, string>;
  /**
   * @description a function that will run in the context of the web page.
   */
  pageFunction?: Parameters<Page['evaluate']>[0];
  fileName?: string;
  /**
   * @description height of the pdf file, the default is to wait until the pdf is loaded and then calculate the height so that it will be in a single PDF page.
   * @default bodyHeight
   */
  pdfHeight?: 'bodyHeight' | number;
  /**
   * @description number of pixels that will be added to the end of the PDF page as safe padding, this applies only for pdfHeight:bodyHeight
   * @default 100
   */
  padding?: number;
  launchOptions?: LaunchOptions;
  goToUrlOptions?: WaitForOptions & {
    referer?: string;
    referrerPolicy?: string;
  };
  htmlContentOptions?: WaitForOptions;
  viewPortOptions?: Viewport;
};

export default async function hdHtml2Pdf({
  html,
  url,
  fileName,
  launchOptions,
  pageFunction,
  pdfWidth = 1280,
  pdfHeight = 'bodyHeight',
  viewPortOptions,
  getPage,
  httpHeaders,
  viewPortWidth = 1280,
  width = 1280,
  goToUrlOptions,
  htmlContentOptions,
  padding = 100,
  emulationMediaType = 'screen',
  waitUntil = 'networkidle0',
}: HdHtml2PdfParams): Promise<Buffer> {
  if (!html && !url) throw new Error('a Url or Html is required');

  if (url) {
    if (!url.includes('http')) url = addHttpToURL(url, true);

    if (!isURL(url, true)) throw new Error('URL is invalid');
  }

  if (!waitUntil) waitUntil = 'networkidle0';
  if (!pdfHeight) pdfHeight = 'bodyHeight';
  if (!fileName) fileName = 'website.pdf';
  if (!width) width = 1280;
  if (!emulationMediaType) emulationMediaType = 'screen';

  // Create a browser instance
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: 'new',
    ignoreHTTPSErrors: true,
    executablePath: executablePath(),
    ...(launchOptions || {}),
  });

  // Create a new page
  const page = await browser.newPage();

  await page.setViewport({
    width: viewPortWidth ?? width,
    height: 720,
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
    ...(viewPortOptions || {}),
  });
  // Website URL to export as pdf

  if (httpHeaders) {
    await page.setExtraHTTPHeaders(httpHeaders);
  }

  if (url) {
    await page.goto(url, joinObjects({ waitUntil }, goToUrlOptions));
  } else {
    await page.setContent(
      html!,
      joinObjects({ waitUntil }, htmlContentOptions)
    );
  }

  //To reflect CSS used for screens instead of print
  await page.emulateMediaType(emulationMediaType);

  let bodyHeight = 0;

  if (pdfHeight === 'bodyHeight') {
    bodyHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
  }

  if (pageFunction) {
    await page.evaluate(pageFunction);
  }

  if (getPage) {
    await Promise.resolve(getPage);
  }

  // Generate a PDF with a custom size
  const pdf = await page.pdf({
    path: fileName,
    width: `${pdfWidth ?? width}px`,
    height:
      pdfHeight === 'bodyHeight'
        ? `${bodyHeight + padding}px`
        : `${pdfHeight}px`, // Height of the entire webpage
    printBackground: true, // Print background graphics
  });

  page.close();

  return pdf;
}
