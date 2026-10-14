// SVG を PNG に変換する（note は SVG をアップロードできないため）。
// Chromium で描画するので、OS に入っている日本語フォントがそのまま使われる。
//
// 使い方: node scripts/svg2png.mjs in.svg out.png [in2.svg out2.png ...]
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
  console.error("使い方: node scripts/svg2png.mjs in.svg out.png [in2.svg out2.png ...]");
  process.exit(1);
}

const browser = await chromium.launch();
try {
  // 2 倍の解像度で描画して、note 上でもくっきり表示されるようにする
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (let i = 0; i < args.length; i += 2) {
    const svg = await readFile(args[i], "utf8");
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`,
    );
    await page.locator("svg").first().screenshot({ path: args[i + 1] });
  }
} finally {
  await browser.close();
}
