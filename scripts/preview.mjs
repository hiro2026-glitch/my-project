// 記事フォルダの article.md と images/ から、確認用の preview.html を作る。
//   npm run note:preview -- articles/<slug>
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { loadArticle } from './lib/article.mjs';

const dirArg = process.argv[2];
if (!dirArg) {
  console.error('使い方：npm run note:preview -- articles/<slug>');
  process.exit(1);
}
const article = loadArticle(dirArg);
const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// まだ作っていない画像は、ファイル名入りの枠で表示する
const renderer = new marked.Renderer();
renderer.image = ({ href, text }) => {
  const exists = fs.existsSync(path.resolve(article.dir, href));
  return exists
    ? `<figure><img src="${escape(href)}" alt="${escape(text)}"><figcaption>${escape(text)}</figcaption></figure>`
    : `<figure class="missing"><div>画像未作成：${escape(href)}</div><figcaption>${escape(text)}</figcaption></figure>`;
};

const thumbnail = article.thumbnail
  ? `<img class="thumb" src="${escape(path.relative(article.dir, article.thumbnail))}" alt="サムネイル">`
  : '<div class="thumb missing">サムネイル未作成：images/thumbnail.png（1280×670px 推奨）</div>';

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(article.title)}</title>
<style>
  :root { --text: #222; --muted: #777; --line: #e6e6e6; --bg: #fff; --soft: #fff6fa; }
  @media (prefers-color-scheme: dark) { :root { --text: #eee; --muted: #aaa; --line: #333; --bg: #161616; --soft: #2a2026; } }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: "Hiragino Sans", "Noto Sans JP", sans-serif; line-height: 2; }
  main { max-width: 620px; margin: 0 auto; padding: 24px 16px 80px; }
  .thumb { width: 100%; aspect-ratio: 1280 / 670; object-fit: cover; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  h1 { font-size: 1.6rem; line-height: 1.5; margin: 24px 0; }
  h2 { font-size: 1.3rem; border-bottom: 1px solid var(--line); padding-bottom: 4px; margin-top: 48px; }
  h3 { font-size: 1.1rem; margin-top: 32px; }
  figure { margin: 24px 0; text-align: center; }
  figure img { max-width: 100%; border-radius: 8px; }
  figcaption { color: var(--muted); font-size: 0.85rem; }
  .missing { background: var(--soft); border: 2px dashed #e8a5c0; color: var(--muted); padding: 32px 8px; border-radius: 8px; }
  figure.missing { padding: 16px 8px; }
  hr { border: none; border-top: 1px solid var(--line); margin: 32px 0; }
  blockquote { border-left: 4px solid var(--line); margin: 0; padding-left: 16px; color: var(--muted); }
  a { color: #2a9d8f; word-break: break-all; }
</style>
</head>
<body>
<main>
${thumbnail}
<h1>${escape(article.title)}</h1>
${marked.parse(article.bodyWithImages, { renderer })}
</main>
</body>
</html>
`;

const out = path.join(article.dir, 'preview.html');
fs.writeFileSync(out, html);
console.log(`プレビューを作りました：${out}`);
