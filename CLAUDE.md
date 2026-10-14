# my-project

note 記事を Claude Code で書き、記事内の解説図を OpenAI の画像生成 API（ChatGPT と同じ系統の画像モデル）で作るためのリポジトリ。

## 構成

- `articles/<YYYY-MM-DD>-<slug>/article.md` — 記事本文
- `articles/<YYYY-MM-DD>-<slug>/images/` — 生成した図
- `scripts/generate_figures.py` — 記事内の `<!-- FIGURE: name | prompt -->` を画像にして埋め込む
- `.claude/commands/note-article.md` — `/note-article <テーマ>` で記事作成〜図の生成まで行う

## ルール

- 図の指示は必ず `<!-- FIGURE: fig<番号>-<英字> | 英語のプロンプト -->` の形式で書く。コメントは画像生成後も残す（作り直し用）。
- 図の中の文字は最小限・短い英語ラベルにする（画像モデルは日本語の文字を崩しやすい）。
- `OPENAI_API_KEY` は `.env` に書く。`.env` はコミットしない。
- 画像生成は有料なので、`--force` での作り直しは必要なときだけ行う。
