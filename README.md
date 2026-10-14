# note 有料記事エージェント

Claude Code のサブエージェントで、note で売れる有料記事を「テーマ発掘 → 取材 → 企画 → 執筆 → 校閲」の順に作ります。

## 使い方

```
/note-paid                 # テーマをゼロから探す
/note-paid AI 業務効率化     # ヒントを渡す
```

途中で 2 回、ユーザーの確認が入ります（テーマ選び、企画の承認）。成果物は **`F:\WORK\CLAUDE-WORK\<日付>-<テーマ>\`** に保存されます。

PC の Claude Code で動かすと、このフォルダに自動保存されます。F ドライブが無い環境（クラウドのセッション）では `articles/` に保存し、完成したファイルを送ります。記事は GitHub には上げません（`articles/` も `.gitignore` 済み）。

| ファイル | 中身 |
|---|---|
| `00_theme-scout.md` | テーマ候補の採点表と上位 3 案 |
| `01_research.md` | 読者の悩み、競合分析、出典付きの事実 |
| `02_plan.md` | 読者像、タイトル案、価格、目次、有料ラインの位置 |
| `03_article.md` | note に貼れる完成原稿 |
| `04_review.md` | 編集長の採点と修正指示 |

## 構成

```
.claude/
  agents/
    note-market-scout.md   ① 売れるテーマを発掘・採点
    note-researcher.md     ② 読者の悩み・競合・一次情報を取材
    note-planner.md        ③ 企画書（タイトル・価格・目次・有料ライン）
    note-writer.md         ④ 本文を執筆（差し戻し時は書き直し）
    note-editor.md         ⑤ 100 点満点で採点し、80 点未満は差し戻し
  commands/
    note-paid.md           ①〜⑤を順に動かすコマンド
knowledge/
  persona.md               書き手の文体（手本の記事 URL、文体サンプル）
  winning-patterns.md      売れる有料記事の型（ジャンル、価格、タイトル、構成）
  quality-checklist.md     採点表
  note-rules.md            規約・法律・信頼のルール
articles/                  F ドライブが無いときの予備の保存先（GitHub には上げない）
```

## 最初にやること
- `knowledge/persona.md` に書き手の経歴・文体を登録済み。記事が増えたらサンプルを追加すると、文体がより近づきます。
- 採点基準や価格帯は `knowledge/` を書き換えれば調整できます。
