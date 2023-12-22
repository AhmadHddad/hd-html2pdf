import puppeteer from 'puppeteer-core';
import { Page, PuppeteerLifeCycleEvent, executablePath } from 'puppeteer';
import { addHttpToURL, isURL } from 'hd-utils';

export type HdHtml2PdfParams = {
  url?: string;
  width?: number;
  html?: string;
  emulationMediaType?: 'screen' | 'print';
  getPage?: (page: Page) => Promise<void>;
  waitUntil?: PuppeteerLifeCycleEvent;
  headers?: Record<string, string>;
  pageFunction?: Parameters<Page['evaluate']>[0];
  fileName?: string;
  pdfHeight?: 'bodyHeight' | number;
};

export default async function hdHtml2Pdf({
  html,
  url,
  fileName,
  pageFunction,
  pdfHeight = 'bodyHeight',
  getPage,
  headers,
  width = 1280,
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
    // add this
    executablePath: executablePath(),
  });

  // Create a new page
  const page = await browser.newPage();

  await page.setViewport({
    width,
    height: 720,
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  });
  // Website URL to export as pdf

  if (headers) {
    await page.setExtraHTTPHeaders(headers);
  }

  if (url) {
    await page.goto(url, { waitUntil });
  } else {
    await page.setContent(html!, { waitUntil });
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
  return await page.pdf({
    path: fileName,
    width: `${width}px`,
    height:
      pdfHeight === 'bodyHeight' ? `${bodyHeight + 100}px` : `${pdfHeight}px`, // Height of the entire webpage
    printBackground: true, // Print background graphics
  });
}
