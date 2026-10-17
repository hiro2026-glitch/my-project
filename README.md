# note 記事作成エージェント

Claude Code で note 記事を作り、note の **下書き** まで保存する仕組みです（公開はしません）。

- 格言シリーズの有料記事（橋渡し文つき）と一般記事の両方に対応
- 記事は `articles/<slug>/article.md` に保存
- サムネイルと解説図は、ChatGPT に貼る日本語プロンプト（パステル調のアニメ風）を `image-prompts.md` に作成
- 確認して OK を出すと、Playwright で note の下書きに保存

## 流れ

```
/note-article kakugen 格言番号… / general テーマ…
  ① note-writer           本文を書く → article.md（図の位置つき）
  ② note-image-prompter   ChatGPT用の画像プロンプト → image-prompts.md
  ③ 確認                  プレビューを見る／ChatGPTで画像を作って images/ に保存
                          → 「OK」と言うまで先に進まない
  ④ note-publisher        Playwright で note の下書きに保存 → draft.json に URL
```

## 初回の準備（画面のあるPCで）

```bash
npm install
npx playwright install chromium   # ブラウザ本体を入れる（初回のみ）
npm run note:login                # 開いたブラウザで note にログイン（終わると自動で閉じます）
```

ログイン状態はブラウザのプロフィールごと `.auth/browser-profile` に保存されます。パスワードと同じくらい大切なフォルダなので、人に渡さないでください（Git には入らない設定にしてあります）。PCに Google Chrome が入っていれば、それを使います（Google ログインが通りやすいため）。

ログインが切れていても、`npm run note:draft` が開いたブラウザでログインすれば、そのまま続きを実行します。

## 使い方

Claude Code で：

```
/note-article kakugen 格言番号：042 格言：〇〇 出典：〇〇 意味：〇〇
/note-article general テーマ：電動ドライバーの選び方 要点：… 体験談：…
```

1. 本文と画像プロンプトが表示されます。
2. `articles/<slug>/image-prompts.md` のプロンプトを ChatGPT に貼り、画像を作ります。
3. 画像を `articles/<slug>/images/` に `thumbnail.png`, `fig1.png`, `fig2.png` … の名前で保存します。
4. 記事に問題がなければ「OK」と返します。直したいところがあれば、そのまま伝えます。
5. note の下書きに保存され、URL が表示されます。

作成済みのフォルダを保存し直すだけなら `/note-draft articles/<slug>` を使います。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run note:preview -- articles/<slug>` | 確認用の `preview.html` を作る |
| `npm run note:draft -- articles/<slug> --dry-run` | 保存する内容と画像がそろっているかを確認するだけ |
| `npm run note:draft -- articles/<slug>` | note の下書きに保存する |

`note:draft` のオプション：

- `--headless` 画面を出さずに実行する
- `--keep-open` 保存後もブラウザを開いたままにして確認する
- `--allow-missing-images` 足りない画像があっても進める（その位置に `【ここに画像：figN.png】` という目印が残る）

## 下書き保存の後に手動でやること

note の公開設定画面で次を設定します。

- 有料記事：「有料エリア」の境界線を橋渡し文の直後（第2章の直前）に置き、価格を設定する
- ハッシュタグ、マガジンへの追加

## フォルダ構成

```
.claude/commands/note-article.md   全体の手順（/note-article）
.claude/commands/note-draft.md     下書き保存だけ（/note-draft）
.claude/agents/                    note-writer / note-image-prompter / note-publisher
rules/                             記事ルール（格言・橋渡し文・一般記事）と画像スタイル
scripts/                           Playwright（ログイン・下書き保存）とプレビュー
articles/<slug>/                   article.md, image-prompts.md, images/, draft.json
```

記事の書き方は `rules/*.md`、画風は `rules/image-style.md` を編集すると変えられます。

## しくみと注意

- note には公式の投稿APIがないため、ブラウザを自動操作しています。note の画面が変わると動かなくなることがあります。その場合は `articles/<slug>/draft-error.png` に失敗した時の画面が残ります。
- 本文は Markdown のまま note のエディタに貼り付けます（note が見出し・太字・リスト・区切り線に変換します）。
- 同じ記事を2回実行すると、下書きが2つできます。
