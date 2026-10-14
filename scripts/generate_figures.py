#!/usr/bin/env python3
"""記事 Markdown 内の図の指示から、ChatGPT 用のプロンプト一覧を作り、用意できた画像を記事に埋め込む。

記事中に次の形式のコメントを書いておく:

    <!-- FIGURE: fig1-overview | ChatGPT に渡す図の指示（日本語） -->

図の作り方は 2 通り:
    --engine chatgpt（既定・無料）
        記事と同じフォルダに prompts.md（コピペ用のプロンプト一覧）を書き出す。
        ChatGPT（無料版で可）に貼り付けて画像を作り、images/<name>.png として保存してから
        もう一度実行すると、記事に画像リンクを入れる。まだ無い画像は一覧に残る。
    --engine openai（有料）
        同じ指示で OpenAI の画像生成 API から自動で作る。
        OPENAI_API_KEY（ChatGPT の有料プランとは別契約）が必要。
        任意で OPENAI_IMAGE_MODEL（既定 gpt-image-1）、OPENAI_IMAGE_SIZE（既定 1536x1024）。

使い方:
    python3 scripts/generate_figures.py articles/2026-10-14-example/article.md

外部ライブラリは不要（標準ライブラリのみ）。
"""

from __future__ import annotations

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
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")

# すべての図に共通で付ける指示。図の雰囲気を揃えるためのもの。
STYLE = (
    "ブログ記事に載せる解説図を1枚作ってください。\n"
    "横長（16:9）、白い背景、フラットでシンプルなデザイン、やわらかい配色、矢印ははっきりと。\n"
    "図の中の文字は、下で「」に入れて指定した言葉だけを、一字一句そのまま正確に書いてください。それ以外の文字は入れないでください。"
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


def full_prompt(desc: str) -> str:
    return f"{STYLE}\n\n{desc.strip()}"


def find_image(images_dir: Path, name: str) -> Path | None:
    for ext in IMAGE_EXTS:
        path = images_dir / f"{name}{ext}"
        if path.exists():
            return path
    return None


def write_prompts(article: Path, figures, images_dir: Path) -> list[str]:
    """prompts.md を書き出し、まだ画像が無い図の名前を返す。"""
    missing = []
    lines = [
        f"# 図のプロンプト（{article.parent.name}）",
        "",
        "1. 下のプロンプトを 1 つずつ ChatGPT に貼り付けて画像を作る",
        "2. できた画像をダウンロードし、`images/` フォルダに指定のファイル名で保存する",
        "3. Claude Code に「画像を保存した」と伝える（またはスクリプトを再実行する）",
        "",
        "文字が崩れていたら、ChatGPT に「〇〇の文字を正確に書き直して」と頼むと直ることがあります。",
        "",
    ]
    for name, desc in figures:
        image = find_image(images_dir, name)
        if image is None:
            missing.append(name)
        status = f"✅ 保存済み（{image.name}）" if image else f"⬜ `images/{name}.png` として保存"
        lines += [f"## {name}", "", status, "", "```text", full_prompt(desc), "```", ""]
    (article.parent / "prompts.md").write_text("\n".join(lines), encoding="utf-8")
    return missing


def generate_image(prompt: str, api_key: str, model: str, size: str) -> bytes:
    body = json.dumps({"model": model, "prompt": prompt, "size": size, "n": 1}).encode()
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


def generate_with_openai(figures, images_dir: Path, force: bool) -> None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    api_key = os.environ.get("OPENAI_API_KEY", "")
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
    size = os.environ.get("OPENAI_IMAGE_SIZE", "1536x1024")
    if not api_key:
        sys.exit("OPENAI_API_KEY が設定されていません。.env に書くか環境変数で渡してください。")

    for name, desc in figures:
        if find_image(images_dir, name) and not force:
            continue
        out = images_dir / f"{name}.png"
        images_dir.mkdir(parents=True, exist_ok=True)
        out.write_bytes(generate_image(full_prompt(desc), api_key, model, size))
        print(f"- {out} を生成しました")


def embed_links(article: Path, text: str, images_dir: Path) -> int:
    """画像がある図だけ、指示コメントの直後に画像リンクを入れる（コメントは作り直し用に残す）。"""
    count = 0

    def embed(m: re.Match) -> str:
        nonlocal count
        name = m.group("name")
        image = find_image(images_dir, name)
        if image is None:
            return m.group(0)
        count += 1
        return f"{m.group('comment')}\n![{name}](images/{image.name})"

    # 既にあるリンク行もまとめてマッチさせ、拡張子が変わっても差し替わるようにする
    block_re = re.compile(
        rf"(?P<comment>{FIGURE_RE.pattern.replace('([', '(?P<name>[', 1)})(?:\n+!\[(?P=name)\]\([^)\n]*\))?",
        re.DOTALL,
    )
    article.write_text(block_re.sub(embed, text), encoding="utf-8")
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("article", type=Path, help="記事の Markdown ファイル")
    parser.add_argument("--engine", choices=["chatgpt", "openai"], default="chatgpt", help="図の作り方（既定: chatgpt）")
    parser.add_argument("--force", action="store_true", help="openai: 既に画像があっても作り直す")
    args = parser.parse_args()

    text = args.article.read_text(encoding="utf-8")
    figures = FIGURE_RE.findall(text)
    if not figures:
        print("FIGURE コメントが見つかりませんでした。")
        return

    images_dir = args.article.parent / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    if args.engine == "openai":
        generate_with_openai(figures, images_dir, args.force)

    missing = write_prompts(args.article, figures, images_dir)
    embedded = embed_links(args.article, text, images_dir)

    print(f"図 {len(figures)} 枚のうち {embedded} 枚を記事に埋め込みました。")
    print(f"プロンプト一覧: {args.article.parent / 'prompts.md'}")
    if missing:
        print("まだ画像がない図:")
        for name in missing:
            print(f"  {images_dir / name}.png")


if __name__ == "__main__":
    main()
