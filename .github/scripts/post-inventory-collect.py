#!/usr/bin/env python3
"""초안·예약글 인벤토리의 "사실"을 수집해 JSON 하나로 떨어뜨린다.

claude-post-inventory 워크플로우의 수집 담당이다. 예전에는 Claude가 직접
`git log --follow ... | tail -1`과 `curl sitemap`을 돌렸는데, 2026-08-04
수동 실행에서 **7턴 27초 만에 종료되고 permission denial 4건**이 찍힌 채
이슈 #163이 갱신되지 않았다. 성공(exit 0)으로 끝나서 로그만 봐서는 정상처럼
보였다. 세는 일을 스크립트로 내려서 그 실패 모드 자체를 없앤다.

  - 이 스크립트: 수집. frontmatter 파싱, git 최초/최종 커밋일, sitemap 대조
  - Claude:      서술. 표 렌더링과 이슈 갱신

**판정 규칙의 단일 출처는 여기가 아니다.** `apps/blog/web/domain/post/`의
`visibility.ts`(isPostFile / isPostVisible)와 `repository.ts`(slug·series 유도)가
원본이고, 이 스크립트는 그 규칙을 미러링한다. 규칙이 바뀌면 여기도 함께 고칠 것.
미러링을 감수한 이유는 원본이 TypeScript라 그대로 쓰려면 pnpm install + tsx가
필요한데, 이 잡은 그 비용 없이 1분 안에 끝나야 하기 때문이다.

사용법:
    python3 .github/scripts/post-inventory-collect.py --out post-inventory-facts.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.etree import ElementTree

KST = timezone(timedelta(hours=9))

# domain/post/types.ts 의 POST_STATUSES 와 같은 집합.
POST_STATUSES = {"published", "draft", "scheduled"}

USER_AGENT = "fe-lab-post-inventory/1 (+https://github.com/Han5991/fe-lab)"

FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---", re.DOTALL)
# 수집에 필요한 건 전부 스칼라 키다. 배열(tags)이나 중첩은 읽지 않는다.
SCALAR_LINE_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$")


def parse_frontmatter(text: str) -> dict | None:
    """frontmatter 스칼라 키만 뽑는다. delimiter가 없으면 None(포스트 아님)."""
    match = FRONTMATTER_RE.search(text)
    if not match:
        return None

    data: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line[:1] in (" ", "\t", "-"):  # 중첩·배열 항목은 건너뛴다
            continue
        key_value = SCALAR_LINE_RE.match(line)
        if not key_value:
            continue
        key, value = key_value.group(1), key_value.group(2).strip()
        if value[:1] in ("'", '"') and value[-1:] == value[:1] and len(value) >= 2:
            value = value[1:-1]
        data[key] = value
    return data


def git_dates(repo_root: Path, file_path: Path) -> dict:
    """파일의 최초/최종 커밋일. 이력이 없으면(미커밋) None."""
    # rglob이 상대 경로를 돌려주므로 repo_root 기준으로 정규화한 뒤 넘긴다.
    relative_path = os.path.relpath(Path(file_path).resolve(), repo_root.resolve())
    try:
        result = subprocess.run(
            ["git", "log", "--follow", "--format=%ad", "--date=short", "--", relative_path],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (subprocess.SubprocessError, OSError) as error:
        return {"first_commit": None, "last_commit": None, "git_error": str(error)}

    if result.returncode != 0:
        return {
            "first_commit": None,
            "last_commit": None,
            "git_error": result.stderr.strip()[:200] or f"exit {result.returncode}",
        }

    dates = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if not dates:
        # checkout이 얕으면(fetch-depth: 1) 이력이 비어 조용히 null이 된다.
        return {"first_commit": None, "last_commit": None, "git_error": "이력 없음"}
    return {"first_commit": dates[-1], "last_commit": dates[0], "git_error": None}


def is_shallow_clone(repo_root: Path) -> bool:
    """얕은 클론이면 최초 커밋일이 **조용히 잘린다**. 값이 null이 아니라 그냥
    틀린 값이 나오므로, 사실표에 남겨 두고 판정 쪽에서 무시할 수 있게 한다."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--is-shallow-repository"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (subprocess.SubprocessError, OSError):
        return False
    return result.stdout.strip() == "true"


def fetch_sitemap_slugs(base_url: str) -> dict:
    """배포된 sitemap의 마지막 경로 세그먼트 집합. 실패해도 예외를 던지지 않는다."""
    url = base_url.rstrip("/") + "/sitemap.xml"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            status = response.status
    except urllib.error.HTTPError as error:
        return {"status": error.code, "error": None, "locs": [], "tail_segments": []}
    except Exception as error:
        return {
            "status": None,
            "error": f"{type(error).__name__}: {error}",
            "locs": [],
            "tail_segments": [],
        }

    try:
        root = ElementTree.fromstring(body.decode("utf-8", errors="replace"))
    except ElementTree.ParseError as error:
        return {
            "status": status,
            "error": f"XML 파싱 실패: {error}",
            "locs": [],
            "tail_segments": [],
        }

    locs: list[str] = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] == "loc" and element.text:
            locs.append(element.text.strip())

    tails = []
    for loc in locs:
        path = urllib.parse.urlparse(loc).path.rstrip("/")
        if path:
            tails.append(urllib.parse.unquote(path.rsplit("/", 1)[-1]))
    return {"status": status, "error": None, "locs": locs, "tail_segments": tails}


def write_step_summary(facts: dict) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return

    lines = [
        "## 수집된 초안·예약글",
        "",
        f"스캔한 마크다운: {facts['scanned_file_count']}개 / "
        f"포스트로 인식: {facts['post_file_count']}개",
        f"draft {len(facts['drafts'])}개 · scheduled {len(facts['scheduled'])}개",
        "",
    ]
    if facts["sitemap"]["error"] or facts["sitemap"]["status"] != 200:
        lines.append(
            f"⚠️ sitemap 조회 실패: status={facts['sitemap']['status']} "
            f"error={facts['sitemap']['error']}"
        )
        lines.append("")
    for entry in facts["drafts"] + facts["scheduled"]:
        lines.append(
            f"- `{entry['status']}` {entry['title']} "
            f"(series={entry['series']}, date={entry['date']}, "
            f"최초={entry['first_commit']}, 최종={entry['last_commit']}, "
            f"sitemap={entry['in_sitemap']})"
        )
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="초안·예약글 인벤토리 수집")
    parser.add_argument("--posts-dir", default="apps/blog/posts")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SITE_BASE_URL", "https://blog.sangwook.dev"),
    )
    parser.add_argument("--out", default="post-inventory-facts.json")
    args = parser.parse_args()

    repo_root = Path.cwd()
    posts_dir = Path(args.posts_dir)
    if not posts_dir.is_dir():
        print(f"포스트 디렉터리가 없습니다: {posts_dir}", file=sys.stderr)
        return 1

    sitemap = fetch_sitemap_slugs(args.base_url)
    sitemap_tails = set(sitemap["tail_segments"])

    scanned = 0
    posts = []
    # `.md`만 훑으면 `.mdx` 글이 조용히 빠진다 — 이 스크립트가 없애려던 실패
    # 모드 그대로다. 미러링 대상인 lib/postFiles.ts의 collectMarkdownFiles가
    # 둘 다 수집하고, 아래 파일명 정규식도 이미 `.mdx`를 상정하고 있다.
    for path in sorted(
        p for pattern in ("*.md", "*.mdx") for p in posts_dir.rglob(pattern)
    ):
        scanned += 1
        data = parse_frontmatter(path.read_text(encoding="utf-8", errors="replace"))
        # frontmatter가 없거나 status가 enum 밖이면 메타 노트다 (isPostFile).
        if data is None or data.get("status") not in POST_STATUSES:
            continue

        relative_path = path.relative_to(posts_dir)
        parts = list(relative_path.parts)
        file_name = re.sub(r"\.(md|mdx)$", "", parts[-1])
        series_path = "/".join(parts[:-1])
        raw_slug = f"{series_path}/{file_name}" if series_path else file_name
        slug = data.get("slug") or raw_slug

        entry = {
            "path": str(path),
            "status": data["status"],
            "title": data.get("title") or file_name,
            "series": series_path or None,
            "slug": slug,
            "date": data.get("date"),
            "scheduledDate": data.get("scheduledDate"),
            # 공개 시각은 scheduledDate가 있으면 그것, 없으면 date (visibility.ts).
            "publish_at": data.get("scheduledDate") or data.get("date"),
            # sitemap의 마지막 경로 세그먼트와 대조 — 실제로 배포됐는지의 근거.
            "in_sitemap": slug.rsplit("/", 1)[-1] in sitemap_tails,
            **git_dates(repo_root, path),
        }
        posts.append(entry)

    now_utc = datetime.now(timezone.utc)
    facts = {
        "collected_at_utc": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "today_kst": now_utc.astimezone(KST).strftime("%Y-%m-%d"),
        "base_url": args.base_url,
        "scanned_file_count": scanned,
        "post_file_count": len(posts),
        # true면 first_commit이 클론 경계에서 잘린 값이라 신뢰할 수 없다.
        "shallow_clone": is_shallow_clone(repo_root),
        "drafts": [p for p in posts if p["status"] == "draft"],
        "scheduled": [p for p in posts if p["status"] == "scheduled"],
        "published_count": len([p for p in posts if p["status"] == "published"]),
        "sitemap": {
            "status": sitemap["status"],
            "error": sitemap["error"],
            "url_count": len(sitemap["locs"]),
        },
    }

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(facts, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    write_step_summary(facts)

    print(f"실측값을 {args.out} 에 기록했습니다.")
    print(
        f"  스캔 {scanned}개 / 포스트 {len(posts)}개 "
        f"(draft {len(facts['drafts'])}, scheduled {len(facts['scheduled'])}, "
        f"published {facts['published_count']}) "
        f"| sitemap status={sitemap['status']} url={len(sitemap['locs'])}개"
    )
    if facts["shallow_clone"]:
        print(
            "  ⚠️ 얕은 클론입니다. first_commit이 잘린 값이니 checkout을 "
            "fetch-depth: 0 으로 두세요.",
            file=sys.stderr,
        )
    elif facts["drafts"] and all(p["first_commit"] is None for p in facts["drafts"]):
        print(
            "  ⚠️ 모든 draft의 git 이력이 비었습니다. checkout fetch-depth를 확인하세요.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
