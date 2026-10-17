// 記事フォルダ（articles/<slug>/）を note の下書きに保存する。公開はしない。
//
//   npm run note:draft -- articles/<slug> [--dry-run] [--headless] [--keep-open] [--allow-missing-images]
//
// 流れ：新規エディタを開く → タイトル → 見出し画像 → 本文（Markdownを貼り付け）
//       → プレースホルダーの位置に図を貼り付け → 「下書き保存」
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadArticle, mimeType } from './lib/article.mjs';

const STATE_PATH = path.resolve('.auth/note-state.json');
// NOTE_EDITOR_URL はテスト用の差し替え先
const EDITOR_NEW_URL = process.env.NOTE_EDITOR_URL ?? 'https://editor.note.com/new';
const SEL = {
  title: 'textarea[placeholder="記事タイトル"]',
  body: '.ProseMirror[contenteditable="true"]',
  headerImageButton: 'button:has([aria-label="画像を追加"])',
  cropModal: '.CropModal__content',
  draftSave: 'button:has-text("下書き保存")',
};

// macOS では Home/End がカーソル移動にならないため、行頭・行末キーを切り替える
const LINE_START = process.platform === 'darwin' ? 'Meta+ArrowLeft' : 'Home';
const LINE_END = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const dirArg = args.find((a) => !a.startsWith('--'));
if (!dirArg) {
  console.error('使い方：npm run note:draft -- articles/<slug> [--dry-run] [--headless] [--keep-open] [--allow-missing-images]');
  process.exit(1);
}

const article = loadArticle(dirArg);
const missing = article.images.filter((img) => !img.exists).map((img) => img.src);
if (!article.thumbnail) missing.unshift('images/thumbnail.png');

console.log(`タイトル：${article.title}`);
console.log(`見出し画像：${article.thumbnail ? path.relative(article.dir, article.thumbnail) : '（なし）'}`);
console.log(`本文：${article.bodyMarkdown.length} 文字（Markdown）`);
for (const img of article.images) {
  console.log(`図：${img.src}  ${img.exists ? 'OK' : '見つかりません'}  「${img.alt}」`);
}

if (missing.length > 0 && !flags.has('--allow-missing-images')) {
  console.error(`\n画像が足りません：${missing.join(', ')}`);
  console.error('images/ に保存するか、--allow-missing-images を付けて実行してください（足りない図の位置には目印の文字が残ります）。');
  process.exit(2);
}
if (flags.has('--dry-run')) {
  console.log('\n--dry-run のため、ブラウザは開きません。');
  process.exit(0);
}
if (!fs.existsSync(STATE_PATH)) {
  console.error(`\nログイン状態がありません（${STATE_PATH}）。先に npm run note:login を実行してください。`);
  process.exit(3);
}

const headless = flags.has('--headless');
const browser = await chromium.launch({ headless });
const context = await browser.newContext({ storageState: STATE_PATH, locale: 'ja-JP', viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const warnings = [];

try {
  await page.goto(EDITOR_NEW_URL);
  if (/note\.com\/login/.test(page.url())) {
    throw new Error('ログインが切れています。npm run note:login をやり直してください。');
  }
  await page.locator(SEL.title).waitFor({ timeout: 30_000 });
  // 新規作成は /notes/<id>/edit へ移動する。移動前に入力すると消えることがあるので待つ。
  await page.waitForURL(/\/notes\/[^/]+\/edit/, { timeout: 15_000 }).catch(() => {});

  await page.locator(SEL.title).fill(article.title);
  console.log('タイトルを入力しました');

  if (article.thumbnail) {
    try {
      await setHeaderImage(page, article.thumbnail);
      console.log('見出し画像を設定しました');
    } catch (e) {
      warnings.push(`見出し画像を設定できませんでした（手動で設定してください）：${e.message.split('\n')[0]}`);
    }
  }

  const body = page.locator(SEL.body).first();
  await body.click();
  await pasteText(page, article.bodyMarkdown);
  await page.waitForTimeout(1000);
  const firstHeading = article.bodyMarkdown.match(/^#{2,3}\s+(.+)$/m)?.[1];
  if (firstHeading && !(await body.innerText()).includes(firstHeading.replace(/\*\*/g, ''))) {
    throw new Error('本文の貼り付けに失敗しました（エディタに本文が入っていません）');
  }
  console.log('本文を貼り付けました');

  for (const img of article.images) {
    if (!img.exists) {
      warnings.push(`${img.src} がないため、目印「${img.placeholder}」を残しました`);
      continue;
    }
    try {
      await insertImageAtPlaceholder(page, img);
      console.log(`図を差し込みました：${img.src}`);
    } catch (e) {
      warnings.push(`${img.src} を差し込めませんでした。目印「${img.placeholder}」の位置に手動で入れてください：${e.message.split('\n')[0]}`);
    }
  }

  await page.locator(SEL.draftSave).first().click();
  // 「保存中」の表示が消えるまで待つ
  await page.waitForFunction(() => !document.body.innerText.includes('保存中'), null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const draftUrl = page.url();
  fs.writeFileSync(
    path.join(article.dir, 'draft.json'),
    JSON.stringify({ url: draftUrl, title: article.title, savedAt: new Date().toISOString(), warnings }, null, 2) + '\n',
  );
  const shot = path.join(article.dir, 'draft-screenshot.png');
  await page.screenshot({ path: shot, fullPage: true });

  console.log(`\n下書きを保存しました：${draftUrl}`);
  console.log(`スクリーンショット：${shot}`);
  for (const w of warnings) console.warn(`警告：${w}`);
  console.log('公開はしていません。有料エリア・価格・ハッシュタグは note の公開設定画面で設定してください。');

  if (flags.has('--keep-open') && !headless) {
    console.log('確認が終わったらブラウザを閉じてください。');
    await page.waitForEvent('close', { timeout: 0 });
  }
} catch (e) {
  const shot = path.join(article.dir, 'draft-error.png');
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.error(`\n失敗しました：${e.message}`);
  console.error(`画面の状態：${shot}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

async function setHeaderImage(page, file) {
  await page.locator(SEL.headerImageButton).first().click();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10_000 }),
    page.getByRole('button', { name: /画像をアップロード/ }).click(),
  ]);
  await chooser.setFiles(file);
  const modal = page.locator(SEL.cropModal);
  await modal.getByRole('button', { name: '保存', exact: true }).click({ timeout: 30_000 });
  await modal.waitFor({ state: 'detached', timeout: 60_000 });
}

// note のエディタは、HTML を含まないテキストの貼り付けを Markdown として解釈する。
async function pasteText(page, text) {
  await page.evaluate(
    ({ selector, text }) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      document.querySelector(selector).dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
    },
    { selector: SEL.body, text },
  );
}

async function pasteImage(page, file) {
  await page.evaluate(
    ({ selector, base64, name, type }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], name, { type }));
      document.querySelector(selector).dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
    },
    { selector: SEL.body, base64: fs.readFileSync(file).toString('base64'), name: path.basename(file), type: mimeType(file) },
  );
}

async function insertImageAtPlaceholder(page, img) {
  const body = page.locator(SEL.body).first();
  const marker = () => body.locator('p', { hasText: img.placeholder }).first();
  const countImages = () => body.locator('img').count();

  // 目印の段落の先頭にカーソルを置いて画像を貼る
  await marker().click();
  await page.keyboard.press(LINE_START);
  const before = await countImages();
  await pasteImage(page, img.file);

  const deadline = Date.now() + 60_000;
  while ((await countImages()) <= before) {
    if (Date.now() > deadline) throw new Error('画像が挿入されませんでした');
    await page.waitForTimeout(500);
  }
  // アップロード中の一時画像（blob:/data:）が本番URLに置き換わるまで待つ
  await page
    .waitForFunction(
      (selector) => ![...document.querySelectorAll(`${selector} img`)].some((i) => /^(blob|data):/.test(i.src)),
      SEL.body,
      { timeout: 60_000 },
    )
    .catch(() => {});

  // 目印の文字を消す（空の段落は残る）
  if ((await marker().count()) > 0) {
    await marker().click();
    await page.keyboard.press(LINE_END);
    await page.keyboard.press(`Shift+${LINE_START}`);
    await page.keyboard.press('Backspace');
  }
}
