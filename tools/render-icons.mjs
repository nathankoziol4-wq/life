import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/logo.svg', 'utf8');
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  );
  const buf = await page.screenshot({ omitBackground: true });
  writeFileSync(`public/icon-${size}.png`, buf);
  await page.close();
  console.log(`icon-${size}.png`);
}
await browser.close();
