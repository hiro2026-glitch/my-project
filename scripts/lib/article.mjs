// articles/<slug>/article.md を読み、note への貼り付けに必要な形に分解する。
import fs from 'node:fs';
import path from 'node:path';

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const THUMBNAIL_NAMES = ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg'];

export function placeholderFor(fileName) {
  return `【ここに画像：${fileName}】`;
}

export function loadArticle(dirArg) {
  const dir = path.resolve(dirArg);
  const mdPath = path.join(dir, 'article.md');
  if (!fs.existsSync(mdPath)) {
    throw new Error(`${mdPath} がありません`);
  }
  const lines = fs.readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

  const titleIndex = lines.findIndex((l) => /^#\s+/.test(l));
  if (titleIndex === -1) {
    throw new Error('article.md に「# タイトル」の行がありません');
  }
  const title = lines[titleIndex].replace(/^#\s+/, '').trim();

  const images = [];
  const bodyLines = lines.slice(titleIndex + 1).map((line) => {
    const m = line.match(IMAGE_LINE);
    if (!m) return line;
    const [, alt, src] = m;
    const file = path.resolve(dir, src);
    const fileName = path.basename(src);
    images.push({ alt, src, file, fileName, exists: fs.existsSync(file), placeholder: placeholderFor(fileName) });
    return placeholderFor(fileName);
  });

  const thumbnail = THUMBNAIL_NAMES.map((n) => path.join(dir, 'images', n)).find((p) => fs.existsSync(p)) ?? null;

  return {
    dir,
    title,
    // note のエディタは貼り付けた Markdown を見出し・リスト・区切り線などに変換する。
    // 画像の行はプレースホルダーに置き換えてあり、あとで画像を貼って差し替える。
    bodyMarkdown: bodyLines.join('\n').trim() + '\n',
    // プレビュー用：画像の行をそのまま残した本文
    bodyWithImages: lines.slice(titleIndex + 1).join('\n').trim() + '\n',
    images,
    thumbnail,
  };
}

export function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  throw new Error(`note に貼れない画像形式です（png/jpg のみ）：${file}`);
}
