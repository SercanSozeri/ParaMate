/**
 * Converts HTML string to PDF and returns base64-encoded PDF.
 */

export async function htmlToPdfBase64(html: string): Promise<string> {
  const puppeteer = await import('puppeteer');

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    const pdfBytes = await page.pdf({
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true,
    });
    const base64 = Buffer.from(pdfBytes).toString('base64');
    return base64;
  } finally {
    await browser.close();
  }
}
