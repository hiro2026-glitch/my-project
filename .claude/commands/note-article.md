---
description: note 記事を作る（本文MD → ChatGPT用の画像プロンプト → 確認 → note の下書き保存）
argument-hint: "[kakugen|general] 記事の素材（格言番号・格言・出典・意味 / テーマ・要点など）"
---

note 記事を、次の手順で作ってください。入力：$ARGUMENTS

## 1. 準備

- モードを決める。格言シリーズ（格言番号・格言・出典がある、または「格言」「有料」と書かれている）なら `kakugen`、それ以外は `general`。判断できなければユーザーに聞く。
- 足りない素材だけユーザーに確認する（`kakugen`：格言番号・格言・出典・意味／`general`：テーマ・要点・体験談・記事の種類）。
- slug を決める：`kakugen` は `kakugen-<格言番号3桁>`、`general` は `<YYYYMMDD>-<英小文字とハイフンの短い名前>`。フォルダ `articles/<slug>/images/` を作る。同じ slug が既にあれば、上書きしてよいかユーザーに聞く。

## 2. 本文を書く

`note-writer` サブエージェントに、モード・素材・出力先 `articles/<slug>/` を渡して `article.md` を書かせる。

## 3. 画像プロンプトを作る

`note-image-prompter` サブエージェントに `articles/<slug>/` を渡して `image-prompts.md` を作らせる。

## 4. 確認してもらう（ここで必ず止まる）

1. `npm run note:preview -- articles/<slug>` でプレビュー `articles/<slug>/preview.html` を作る。
2. ユーザーに次を見せる：
   - `article.md` の本文（全文）と、図を入れる位置
   - `image-prompts.md` のプロンプト（ChatGPT にそのまま貼れる形）
   - 次にやること：「ChatGPT で画像を作り、`articles/<slug>/images/` に `thumbnail.png` と `fig1.png` … の名前で保存してください。記事と画像がよければ『OK』、直したい点があれば教えてください。」
3. 直したい点が来たら、該当するサブエージェント（本文なら note-writer、画像なら note-image-prompter）に直させ、4 をやり直す。
4. **ユーザーがはっきり「OK」と言うまで、5 に進まない。**

## 5. note の下書きに保存する

`note-publisher` サブエージェントに `articles/<slug>/` を渡して下書き保存させる。
画像が足りないと返ってきたら、ユーザーに「画像を保存してから進めるか、画像なしで下書きを作るか」を聞く。
ログインが必要と返ってきたら、手元のPCで `npm run note:login` を実行してもらう。

## 6. 完了報告

- 下書きのURL
- 保存したファイル（`article.md`, `image-prompts.md`, `images/`）
- note 側で手動でやること：有料記事なら公開設定画面で「有料エリア」の境界線を橋渡し文の直後（第2章の直前）に置く、価格・ハッシュタグ・マガジン追加を設定する
- 公開はしていないこと
