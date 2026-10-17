// note 用のブラウザを開く。ログイン状態はブラウザのプロフィールごと .auth/browser-profile に残る。
// Google ログインは自動操作のブラウザを拒否することがあるため、PCに Google Chrome があればそれを使う。
import path from 'node:path';
import { chromium } from 'playwright';

const PROFILE_DIR = path.resolve('.auth/browser-profile');
// NOTE_EDITOR_URL はテスト用の差し替え先
export const EDITOR_NEW_URL = process.env.NOTE_EDITOR_URL ?? 'https://editor.note.com/new';
export const TITLE_SELECTOR = 'textarea[placeholder="記事タイトル"]';

export async function launchNoteBrowser({ headless = false } = {}) {
  const options = {
    headless,
    locale: 'ja-JP',
    viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  };
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, { ...options, channel: 'chrome' });
  } catch {
    context = await chromium.launchPersistentContext(PROFILE_DIR, options);
  }
  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

// 新規エディタを開く。ログインしていなければ、画面でログインし終わるまで待ってから開き直す。
export async function openEditor(page, { headless, loginTimeoutMs = 5 * 60_000 }) {
  await page.goto(EDITOR_NEW_URL);
  const title = page.locator(TITLE_SELECTOR);
  if (await title.waitFor({ timeout: 15_000 }).then(() => true, () => false)) return;

  if (headless) {
    throw new Error('note にログインしていません。--headless を付けずに実行し、開いた画面でログインしてください。');
  }
  console.log('\nnote にログインしていません。開いたブラウザでログインしてください（最大5分待ちます）。');
  console.log('ログインが終わると、自動で続きを始めます。');
  const deadline = Date.now() + loginTimeoutMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    const url = page.url();
    // ログイン画面や Google の画面にいる間は待つ
    if (/note\.com\/login|accounts\.google\.com|appleid\.apple\.com|twitter\.com|x\.com/.test(url)) continue;
    if (!url.startsWith('https://editor.note.com/')) {
      await page.goto(EDITOR_NEW_URL).catch(() => {});
    }
    if (await title.waitFor({ timeout: 10_000 }).then(() => true, () => false)) {
      console.log('ログインできました。続けます。');
      return;
    }
  }
  throw new Error('ログインが確認できませんでした（5分たちました）。');
}
