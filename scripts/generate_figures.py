#!/usr/bin/env python3
"""記事 Markdown 内の図の指示を OpenAI の画像生成 API で画像にする。

記事中に次の形式のコメントを書いておくと、画像を生成して Markdown の画像リンクに置き換える:

    <!-- FIGURE: fig1-overview | 図の内容を説明するプロンプト -->

使い方:
    python3 scripts/generate_figures.py articles/2026-10-14-example/article.md
    python3 scripts/generate_figures.py article.md --dry-run   # API を呼ばずに確認

必要な環境変数:
    OPENAI_API_KEY      OpenAI の API キー（ChatGPT の有料プランとは別契約）
    OPENAI_IMAGE_MODEL  省略時 gpt-image-1
    OPENAI_IMAGE_SIZE   省略時 1536x1024（横長。note の見出し画像・図に向く）

外部ライブラリは不要（標準ライブラリのみ）。
"""

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://api.openai.com/v1/images/generations"
FIGURE_RE = re.compile(r"<!--\s*FIGURE:\s*([\w.-]+)\s*\|\s*(.+?)\s*-->", re.DOTALL)

# すべての図に共通で付けるスタイル指示。図の雰囲気を揃えるためのもの。
STYLE = (
    "Clean, flat explanatory diagram for a Japanese blog article. "
    "White background, simple shapes, soft colors, clear arrows. "
    "Use as little text as possible; if text is needed, use short, correctly spelled labels."
)


def load_dotenv(path: Path) -> None:
    """リポジトリ直下の .env を読み込む（既に設定済みの環境変数は上書きしない）。"""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def generate_image(prompt: str, api_key: str, model: str, size: str) -> bytes:
    body = json.dumps({"model": model, "prompt": f"{STYLE}\n\n{prompt}", "size": size, "n": 1}).encode()
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.load(resp)["data"][0]
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")
            # レート制限とサーバーエラーだけ再試行する
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            raise SystemExit(f"画像生成に失敗しました (HTTP {e.code}): {detail}")
    if "b64_json" in data:
        return base64.b64decode(data["b64_json"])
    with urllib.request.urlopen(data["url"], timeout=120) as resp:
        return resp.read()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("article", type=Path, help="記事の Markdown ファイル")
    parser.add_argument("--dry-run", action="store_true", help="API を呼ばず、生成予定の図を表示するだけ")
    parser.add_argument("--force", action="store_true", help="既に画像があっても作り直す")
    args = parser.parse_args()

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

    text = args.article.read_text(encoding="utf-8")
    figures = FIGURE_RE.findall(text)
    if not figures:
        print("FIGURE コメントが見つかりませんでした。")
        return

    images_dir = args.article.parent / "images"
    api_key = os.environ.get("OPENAI_API_KEY", "")
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
    size = os.environ.get("OPENAI_IMAGE_SIZE", "1536x1024")

    if not args.dry_run and not api_key:
        sys.exit("OPENAI_API_KEY が設定されていません。.env に書くか環境変数で渡してください。")

    for name, prompt in figures:
        out = images_dir / f"{name}.png"
        print(f"- {out}: {' '.join(prompt.split())[:80]}")
        if args.dry_run:
            continue
        if out.exists() and not args.force:
            print("  既存の画像を使います（作り直すには --force）")
        else:
            images_dir.mkdir(parents=True, exist_ok=True)
            out.write_bytes(generate_image(prompt, api_key, model, size))
            print("  生成しました")

    if args.dry_run:
        return

    # 図の指示コメントは残し（再生成用）、直後に画像リンクを入れる
    def embed(m: re.Match) -> str:
        name = m.group(1)
        link = f"![{name}](images/{name}.png)"
        return m.group(0) if link in text[m.end():m.end() + len(link) + 2] else f"{m.group(0)}\n{link}"

    args.article.write_text(FIGURE_RE.sub(embed, text), encoding="utf-8")
    print(f"{len(figures)} 枚の図を {args.article} に埋め込みました。")


if __name__ == "__main__":
    main()
