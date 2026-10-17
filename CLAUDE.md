# CLAUDE.md

note.com（alert_hiro20）向けの記事を作り、note の下書きに保存するためのリポジトリ。

- 記事作成の入口は `/note-article`（`.claude/commands/note-article.md`）。手順はそこに従う。
- 記事ルールは `rules/` が正。アカウント側の同名スキル（kakugen-paid など）より、このリポジトリの `rules/` を優先する。
- 画像は ChatGPT でユーザーが作る。こちらは日本語プロンプト（`image-prompts.md`）だけを作る。
- **note では絶対に公開しない。** 下書き保存まで。ユーザーが記事に「OK」を出す前に `note:draft` を実行しない。
- `.auth/` はログイン情報なので、読まない・表示しない・コミットしない。
- 動作確認：`npm run note:draft -- articles/<slug> --dry-run`、`npm run note:preview -- articles/<slug>`。
