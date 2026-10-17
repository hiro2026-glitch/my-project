// PCで行う作業（最新の記事の取り込み → 画像の確認 → note の下書き保存）をまとめて行う。
// 大事なところ（どの記事か・画像が足りないとき・保存する直前）では必ず確認する。
//   npm run note:go     （エクスプローラーで note-draft.cmd をダブルクリックしても同じ）
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { loadArticle } from './lib/article.mjs';

const ARTICLES_DIR = path.resolve('articles');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (await rl.question(q)).trim();
const yes = async (q) => /^y(es)?$/i.test(await ask(`${q} (y/n)：`));

function step(title) {
  console.log(`\n==== ${title} ====`);
}

function openFolder(dir) {
  const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [dir], { detached: true, stdio: 'ignore' }).unref();
}

function listArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ARTICLES_DIR, d.name, 'article.md')))
    .map((d) => {
      const dir = path.join(ARTICLES_DIR, d.name);
      return { slug: d.name, dir, saved: fs.existsSync(path.join(dir, 'draft.json')), mtime: fs.statSync(path.join(dir, 'article.md')).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function missingImages(article) {
  const missing = article.images.filter((img) => !img.exists).map((img) => img.fileName);
  if (!article.thumbnail) missing.unshift('thumbnail.png');
  return missing;
}

async function main() {
  step('1. 最新の記事を取り込みます（git pull）');
  const pull = spawnSync('git', ['pull'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (pull.status !== 0) {
    console.error('取り込みに失敗しました。上のメッセージを Claude に送ってください。');
    return 1;
  }

  step('2. 記事を選びます');
  const articles = listArticles();
  if (articles.length === 0) {
    console.error('articles フォルダに記事がありません。');
    return 1;
  }
  articles.forEach((a, i) => console.log(`  ${i + 1}. ${a.slug}${a.saved ? '  （下書き保存済み）' : ''}`));
  const answer = await ask(`番号を入力してください（Enter だけなら 1）：`);
  const chosen = articles[(Number(answer) || 1) - 1];
  if (!chosen) {
    console.error('その番号の記事はありません。');
    return 1;
  }

  step('3. 画像がそろっているか確認します');
  const imagesDir = path.join(chosen.dir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });
  let article = loadArticle(chosen.dir);
  let missing = missingImages(article);
  while (missing.length > 0) {
    console.log(`足りない画像：${missing.join(', ')}`);
    console.log(`保存先：${imagesDir}`);
    if (await yes('保存先のフォルダを開きますか？')) openFolder(imagesDir);
    const next = await ask('保存したら Enter、画像なしで進めるなら skip、やめるなら q：');
    if (/^q$/i.test(next)) return 0;
    if (/^skip$/i.test(next)) break;
    article = loadArticle(chosen.dir);
    missing = missingImages(article);
  }
  if (missing.length === 0) console.log('画像はすべてそろっています。');

  step('4. 保存する内容の確認');
  console.log(`タイトル：${article.title}`);
  console.log(`見出し画像：${article.thumbnail ? path.basename(article.thumbnail) : '（なし）'}`);
  for (const img of article.images) console.log(`図：${img.fileName}  ${img.exists ? 'OK' : 'なし（目印の文字が残ります）'}`);
  if (chosen.saved) {
    console.log('\n注意：この記事は前に下書き保存しています。もう一度保存すると、note に下書きが2つできます。');
  }
  console.log('\nブラウザが開き、自動で入力して「下書き保存」まで行います（公開はしません）。');
  console.log('ログイン画面が出たらログインしてください。入力中はマウスとキーボードに触らないでください。');
  if (!(await yes('note に下書き保存しますか？'))) {
    console.log('やめました。');
    return 0;
  }
  rl.close();

  step('5. note に下書き保存します');
  const args = ['scripts/note-draft.mjs', chosen.dir, '--keep-open'];
  if (missing.length > 0) args.push('--allow-missing-images');
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('\nうまくいきませんでした。もう一度実行せず、この画面と draft-error.png を Claude に送ってください。');
  }
  return result.status ?? 1;
}

const code = await main().catch((e) => {
  console.error(e.message);
  return 1;
});
rl.close();
process.exitCode = code;
