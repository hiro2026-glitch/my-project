# my-project

note 記事を Claude Code で書き、記事内の解説図も Claude Code が SVG で描いて PNG にするためのリポジトリ。

## 構成

- `articles/<YYYY-MM-DD>-<slug>/article.md` — 記事本文
- `articles/<YYYY-MM-DD>-<slug>/images/` — 図（`*.svg` が元データ、`*.png` が note にアップロードする画像）
- `scripts/generate_figures.py` — 記事内の `<!-- FIGURE: name | 説明 -->` に対応する SVG を PNG にして埋め込む
- `scripts/svg2png.mjs` — SVG → PNG 変換（Playwright の Chromium を使用）
- `.claude/commands/note-article.md` — `/note-article <テーマ>` で記事作成〜図の作成まで行う

## セットアップ

```bash
npm install
npx playwright install chromium
```

## ルール

- 図の指示は `<!-- FIGURE: fig<番号>-<英字> | 説明 -->` の形式で書く。コメントは画像生成後も残す。
- 図を直すときは SVG を編集してから `python3 scripts/generate_figures.py <article.md>` を再実行する（PNG は直接編集しない）。
- 有料の OpenAI 画像生成（`--engine openai`）はユーザーに頼まれたときだけ使う。その場合 `OPENAI_API_KEY` を `.env` に書き、`.env` はコミットしない。
