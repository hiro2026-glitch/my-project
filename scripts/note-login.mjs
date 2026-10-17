// note にブラウザでログインし、ログイン状態を .auth/note-state.json に保存する。
// 画面のあるPCで実行する：npm run note:login
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium } from 'playwright';

const STATE_PATH = path.resolve('.auth/note-state.json');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ locale: 'ja-JP' });
const page = await context.newPage();
await page.goto('https://note.com/login');

console.log('開いたブラウザで note にログインしてください。');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('ログインが終わったら、ここで Enter を押してください：');
rl.close();

if (/\/login/.test(page.url())) {
  console.error('まだログイン画面のようです。ログインしてからもう一度実行してください。');
  await browser.close();
  process.exit(1);
}

fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
await context.storageState({ path: STATE_PATH });
fs.chmodSync(STATE_PATH, 0o600);
console.log(`ログイン状態を保存しました：${STATE_PATH}`);
console.log('このファイルはパスワードと同じくらい大切です。人に渡したり Git に入れたりしないでください。');
await browser.close();
