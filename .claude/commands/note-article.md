---
description: note 記事を書き、解説図を SVG で作って PNG にして埋め込む
argument-hint: 記事のテーマや要点
---

次のテーマで note 記事を作成し、解説図も作ってください。

テーマ・要点: $ARGUMENTS

## 手順

1. **記事フォルダを作る**
   `articles/<今日の日付 YYYY-MM-DD>-<英数字の短いスラッグ>/article.md` を作成する。

2. **本文を書く**
   - note-general スキルが使える場合は、その文体・構成ルールに従う。
   - 図があると理解しやすい箇所（仕組み、手順、比較、全体像、配線など）に 2〜4 枚の図を入れる。
   - 図を入れる位置に、次の形式のコメントを書く:

     ```
     <!-- FIGURE: fig1-overview | 図の内容（日本語で可） -->
     ```

     ファイル名は `fig<番号>-<英字の内容>` とする。

3. **図を SVG で描く**
   各図について `images/<ファイル名>.svg` を書く。ルール:
   - `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">`（16:9）を基本にする。縦長が必要なら高さだけ変える。
   - 最初に白い背景の `<rect width="100%" height="100%" fill="#ffffff"/>` を置く。
   - フォントは `font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP','Noto Sans CJK JP',sans-serif"`。本文ラベルは 24〜32px、タイトルは 36〜44px。
   - 色は 3〜4 色まで。例: 濃い文字 `#1f2937`、メイン `#2563eb`、サブ `#f59e0b`、薄い背景 `#eff6ff`。
   - 角丸の箱（`rx="16"`）と矢印（`<marker>` で矢じり）で構成し、要素どうしの間隔を十分あける。
   - 日本語の文字は 1 行が長くならないよう、箱の幅に収まる長さで `<tspan>` 改行する。文字が箱からはみ出さないよう、1 文字 ≒ フォントサイズ px として幅を見積もる。
   - 外部の画像・フォント・スクリプトは使わない。

4. **PNG に変換して埋め込む**
   `python3 scripts/generate_figures.py <article.md>` を実行する。
   Node.js や Playwright が無いエラーが出たら、ユーザーに `npm install && npx playwright install chromium` を案内する。

5. **確認する**
   生成された `images/*.png` を Read で開いて目視確認する。文字のはみ出し・重なり・見切れがあれば SVG を直して再実行する（最大 2 回まで）。

6. **報告する**
   記事ファイルと画像の場所、各図の内容を短くまとめる。note には本文を貼り付け、PNG を手動でアップロードする必要があることも伝える。

（有料の OpenAI 画像生成を使いたいと言われた場合だけ、コメントに英語のプロンプトを書いて `--engine openai` で実行する。）
