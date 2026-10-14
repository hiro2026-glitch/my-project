# my-project

note 記事を Claude Code で書き、記事内の解説図は ChatGPT（無料版）で作るためのリポジトリ。
ChatGPT 無料版はプログラムから呼べないので、プロンプトの貼り付けと画像の保存だけはユーザーが手作業で行う。

## 流れ

1. `/note-article <テーマ>` — 記事を書き、図ごとの ChatGPT 用プロンプトを `prompts.md` にまとめる
2. ユーザーがプロンプトを ChatGPT に貼り付け、できた画像を記事フォルダの `images/` に保存する
3. `/note-images`（または「画像を保存した」）— 画像の名前を合わせ、記事に埋め込み、内容を確認する

## 構成

- `articles/<YYYY-MM-DD>-<slug>/article.md` — 記事本文
- `articles/<YYYY-MM-DD>-<slug>/prompts.md` — ChatGPT に貼り付けるプロンプト一覧（自動生成）
- `articles/<YYYY-MM-DD>-<slug>/images/` — ChatGPT で作った画像
- `scripts/generate_figures.py` — `prompts.md` の作成と、画像の埋め込み

## ルール

- 図の指示は `<!-- FIGURE: fig<番号>-<英字> | ChatGPT への指示 -->` の形式で書く。コメントは画像を埋め込んだ後も残す。
- 図に入れる文字は「」で囲んで明示し、少なく短くする（ChatGPT は文字が多いと崩しやすい）。
- `prompts.md` は手で編集しない。指示を直すときは記事内のコメントを直してスクリプトを再実行する。
- 有料の OpenAI 画像生成 API（`--engine openai`）はユーザーに頼まれたときだけ使う。その場合 `OPENAI_API_KEY` を `.env` に書き、`.env` はコミットしない。
