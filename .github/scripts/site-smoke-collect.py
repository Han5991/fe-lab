#!/usr/bin/env python3
"""배포된 블로그의 "실측값"을 수집해 JSON 사실표 하나로 떨어뜨린다.

claude-site-smoke 워크플로우의 수집 담당이다. 예전에는 이 일을 Claude가
직접 curl로 했는데, allowed-tools가 `Bash(curl:*)` 접두 매칭이라
`curl ... | grep -c` 같은 조합이 전부 거부됐다. 우회하느라 턴 수와 비용이
계속 늘었고(31턴/11건 → 52턴/21건), 무엇보다 **어떤 항목이 실제로 측정됐는지
로그에 남지 않아** "성공 = 정상"을 신뢰할 수 없었다.

그래서 역할을 나눴다.
  - 이 스크립트: 측정. HTTP 상태·앵커 개수·lastmod 분포처럼 세면 끝나는 것들
  - Claude:      판정. 저장소 발행 글과의 대조, 회귀 여부, 이슈 작성

파이썬인 이유는 XML 때문이다. 검사 항목이 sitemap/rss의 **유효성**을 요구하는데
Node에는 XML 파서가 내장돼 있지 않고, 정규식으로 흉내 내면 깨진 XML을 통과시킨다.
파이썬은 표준 라이브러리(ElementTree)로 진짜 파싱을 하므로 러너에 설치할 것이
없다. 이 저장소의 유일한 파이썬 파일이고, CI 글루 용도로만 쓴다.

사이트가 죽었어도 이 스크립트는 exit 0으로 끝난다 — 그건 Claude가 이슈로
보고할 "사실"이지 수집 실패가 아니다. 반대로 예상 못 한 예외는 그대로 터뜨려
잡을 실패시킨다(조용히 빈 사실표를 넘기면 "정상"으로 오판된다).

사용법:
    python3 .github/scripts/site-smoke-collect.py --out site-smoke-facts.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree

KST = timezone(timedelta(hours=9))

USER_AGENT = "fe-lab-site-smoke/1 (+https://github.com/Han5991/fe-lab)"

# 배포 직후 일시적으로 뜰 수 있는 상태코드. 이것만 재시도한다.
# 404는 재시도해도 의미가 없고, 그 자체가 보고할 사실이다.
TRANSIENT_STATUS = {408, 425, 429, 500, 502, 503, 504}

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
HTML_TAG_RE = re.compile(r"<html[\s>]", re.IGNORECASE)
# 목록 페이지의 정적 앵커. 쿼리/프래그먼트는 뒤에서 잘라내는데, 정규식에서
# `[^"#?]`로 배제해 버리면 그런 링크가 카운트에서 **통째로 빠진다**. 앵커 0개는
# critical 판정 신호라 과소집계는 오탐으로 직결되므로 일단 다 잡고 뒤에서 정규화한다.
POST_ANCHOR_RE = re.compile(r"""href=["'](/posts/[^"']*)["']""")
CANONICAL_TAG_RE = re.compile(
    r"""<link[^>]+rel=["']canonical["'][^>]*>""", re.IGNORECASE
)
OG_TITLE_TAG_RE = re.compile(
    r"""<meta[^>]+property=["']og:title["'][^>]*>""", re.IGNORECASE
)
HREF_ATTR_RE = re.compile(r"""href=["']([^"']*)["']""", re.IGNORECASE)
CONTENT_ATTR_RE = re.compile(r"""content=["']([^"']*)["']""", re.IGNORECASE)


def local_name(tag: str) -> str:
    """`{ns}url` → `url`. sitemap/rss 네임스페이스 유무에 무관하게 읽기 위한 것."""
    return tag.rsplit("}", 1)[-1]


def fetch(
    base_url: str,
    path: str,
    retries: int,
    retry_delay: float,
    deadline: float | None = None,
) -> tuple[dict, str]:
    """한 경로를 가져와 (메타, 본문) 을 돌려준다. 실패해도 예외를 던지지 않는다.

    `deadline`은 **전체 수집**의 마감 시각(time.monotonic 기준)이다. 사이트가
    완전히 죽으면 경로 6개 × 재시도 × 타임아웃이 곱해져 잡 타임아웃을 넘기고,
    그러면 이슈도 못 만든 채 잡만 빨갛게 죽는다. 마감을 넘기면 재시도를 접고
    지금까지의 사실을 그대로 넘긴다.
    """
    url = base_url.rstrip("/") + path
    attempt = 0

    def may_retry(current_attempt: int) -> bool:
        if current_attempt >= retries:
            return False
        if deadline is not None and time.monotonic() + retry_delay >= deadline:
            return False
        return True

    while True:
        attempt += 1
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"}
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
                meta = {
                    "url": url,
                    "status": response.status,
                    "content_type": response.headers.get("Content-Type"),
                    "bytes": len(body),
                    "attempts": attempt,
                    "error": None,
                }
                return meta, body.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            body = error.read() or b""
            if error.code in TRANSIENT_STATUS and may_retry(attempt):
                time.sleep(retry_delay)
                continue
            meta = {
                "url": url,
                "status": error.code,
                "content_type": error.headers.get("Content-Type") if error.headers else None,
                "bytes": len(body),
                "attempts": attempt,
                "error": None,
            }
            return meta, body.decode("utf-8", errors="replace")
        except Exception as error:  # URLError, timeout, DNS 실패 등
            if may_retry(attempt):
                time.sleep(retry_delay)
                continue
            meta = {
                "url": url,
                "status": None,
                "content_type": None,
                "bytes": 0,
                "attempts": attempt,
                "error": f"{type(error).__name__}: {error}",
            }
            return meta, ""


def html_facts(meta: dict, text: str) -> dict:
    """"200이고 실제 콘텐츠가 있는 HTML인가"를 판정할 재료."""
    match = TITLE_RE.search(text)
    return {
        **meta,
        "has_html_tag": bool(HTML_TAG_RE.search(text)),
        "title": match.group(1).strip()[:200] if match else None,
    }


def parse_sitemap(text: str, today_utc: str, today_kst: str) -> dict:
    """sitemap.xml을 실제로 파싱한다. lastmod 분포까지 세어 회귀 판단 재료를 남긴다."""
    facts: dict = {
        "xml_valid": False,
        "xml_error": None,
        "url_count": 0,
        "locs": [],
        "lastmod_counts": {},
        "missing_lastmod_count": 0,
        "distinct_lastmod_count": 0,
        "all_lastmod_is_check_date": False,
    }
    if not text.strip():
        facts["xml_error"] = "빈 응답"
        return facts

    try:
        root = ElementTree.fromstring(text)
    except ElementTree.ParseError as error:
        facts["xml_error"] = str(error)
        return facts

    facts["xml_valid"] = True

    lastmod_dates: list[str] = []
    for url_element in (el for el in root if local_name(el.tag) == "url"):
        loc = None
        lastmod = None
        for child in url_element:
            name = local_name(child.tag)
            if name == "loc":
                loc = (child.text or "").strip()
            elif name == "lastmod":
                lastmod = (child.text or "").strip()
        facts["locs"].append({"loc": loc, "lastmod": lastmod})
        if lastmod:
            lastmod_dates.append(lastmod[:10])  # 'YYYY-MM-DD' 부분만
        else:
            facts["missing_lastmod_count"] += 1

    facts["url_count"] = len(facts["locs"])
    counts = Counter(lastmod_dates)
    facts["lastmod_counts"] = dict(sorted(counts.items()))
    facts["distinct_lastmod_count"] = len(counts)
    # "모든 lastmod가 검사 당일" = 매 빌드마다 lastmod가 전진하는 회귀 신호.
    # 빌드는 UTC 자정, 검사는 그 직후라 UTC/KST 어느 쪽으로 찍혀도 잡히게 둘 다 본다.
    facts["all_lastmod_is_check_date"] = bool(lastmod_dates) and set(
        lastmod_dates
    ) <= {today_utc, today_kst}
    return facts


def parse_rss(text: str) -> dict:
    """rss.xml 유효성과 item 개수."""
    facts: dict = {"xml_valid": False, "xml_error": None, "item_count": 0, "first_items": []}
    if not text.strip():
        facts["xml_error"] = "빈 응답"
        return facts

    try:
        root = ElementTree.fromstring(text)
    except ElementTree.ParseError as error:
        facts["xml_error"] = str(error)
        return facts

    facts["xml_valid"] = True
    items = [el for el in root.iter() if local_name(el.tag) == "item"]
    facts["item_count"] = len(items)
    for item in items[:5]:
        title = None
        link = None
        for child in item:
            name = local_name(child.tag)
            if name == "title":
                title = (child.text or "").strip()
            elif name == "link":
                link = (child.text or "").strip()
        facts["first_items"].append({"title": title, "link": link})
    return facts


def parse_robots(text: str) -> dict:
    """robots.txt가 sitemap을 가리키는지."""
    sitemap_lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip().lower().startswith("sitemap:")
    ]
    return {
        "references_sitemap": bool(sitemap_lines),
        "sitemap_lines": sitemap_lines,
        "line_count": len([line for line in text.splitlines() if line.strip()]),
    }


def parse_article(meta: dict, text: str) -> dict:
    """글 상세 페이지의 canonical / og:title 존재 여부."""
    canonical_tag = CANONICAL_TAG_RE.search(text)
    canonical_href = None
    if canonical_tag:
        href = HREF_ATTR_RE.search(canonical_tag.group(0))
        canonical_href = href.group(1) if href else None

    og_title_tag = OG_TITLE_TAG_RE.search(text)
    og_title = None
    if og_title_tag:
        content = CONTENT_ATTR_RE.search(og_title_tag.group(0))
        og_title = content.group(1) if content else None

    return {
        **meta,
        "has_canonical": canonical_tag is not None,
        "canonical": canonical_href,
        "has_og_title": og_title_tag is not None,
        "og_title": og_title,
    }


def write_step_summary(facts: dict) -> None:
    """수집 결과를 Step Summary에 표로 남긴다. Claude 리포트를 열기 전에 보이는 층."""
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return

    home = facts["pages"]["/"]
    index = facts["pages"]["/posts/"]
    sitemap = facts["sitemap"]
    rss = facts["rss"]
    robots = facts["robots"]
    article = facts["article"]

    lines = [
        "## 수집된 실측값",
        "",
        f"대상: `{facts['base_url']}` / 수집 시각: `{facts['checked_at_utc']}` (UTC)",
        "",
        "| 항목 | 실측값 |",
        "| :--- | :--- |",
        f"| 홈 `/` | HTTP {home['status']} · {home['bytes']:,} bytes · title={home['title']!r} |",
        f"| 목록 `/posts/` | HTTP {index['status']} · {index['bytes']:,} bytes |",
        f"| `/posts/` 정적 앵커 | {facts['posts_index']['post_anchor_count']}개 |",
        f"| `/sitemap.xml` | HTTP {sitemap['status']} · XML {'유효' if sitemap['xml_valid'] else '무효'} · url {sitemap['url_count']}개 |",
        f"| lastmod 분포 | 서로 다른 날짜 {sitemap['distinct_lastmod_count']}종 · 전부 검사당일={sitemap['all_lastmod_is_check_date']} |",
        f"| `/rss.xml` | HTTP {rss['status']} · XML {'유효' if rss['xml_valid'] else '무효'} · item {rss['item_count']}개 |",
        f"| `/robots.txt` | HTTP {robots['status']} · sitemap 참조={robots['references_sitemap']} |",
        f"| 글 상세 | HTTP {article['status']} · canonical={article['has_canonical']} · og:title={article['has_og_title']} |",
        "",
        f"검사한 글 상세: `{article.get('url')}`",
    ]
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="블로그 배포 결과물 실측값 수집")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SITE_BASE_URL", "https://blog.sangwook.dev"),
    )
    parser.add_argument("--out", default="site-smoke-facts.json")
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="일시적 오류(5xx/타임아웃) 재시도 횟수",
    )
    parser.add_argument(
        "--retry-delay",
        type=float,
        default=60.0,
        help="재시도 간격(초). 배포 직후 전파 지연을 흡수한다",
    )
    parser.add_argument(
        "--deadline",
        type=float,
        default=600.0,
        help="수집 전체의 상한(초). 넘기면 재시도를 접고 지금까지의 사실로 끝낸다",
    )
    args = parser.parse_args()

    deadline = time.monotonic() + args.deadline

    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.strftime("%Y-%m-%d")
    today_kst = now_utc.astimezone(KST).strftime("%Y-%m-%d")

    def get(path: str) -> tuple[dict, str]:
        return fetch(args.base_url, path, args.retries, args.retry_delay, deadline)

    home_meta, home_text = get("/")
    index_meta, index_text = get("/posts/")
    sitemap_meta, sitemap_text = get("/sitemap.xml")
    rss_meta, rss_text = get("/rss.xml")
    robots_meta, robots_text = get("/robots.txt")

    # 목록 페이지는 최신순이므로 등장 순서를 보존한 첫 앵커가 가장 최근 글이다.
    # 쿼리·프래그먼트를 떼고, 목록 자신(`/posts/`)은 개별 글이 아니므로 뺀다.
    normalized_anchors = (
        re.split(r"[#?]", anchor, maxsplit=1)[0]
        for anchor in POST_ANCHOR_RE.findall(index_text)
    )
    ordered_anchors = [
        anchor
        for anchor in dict.fromkeys(normalized_anchors)
        if anchor.rstrip("/") != "/posts"
    ]
    anchors = sorted(ordered_anchors)

    facts: dict = {
        "base_url": args.base_url,
        "checked_at_utc": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "today_utc": today_utc,
        "today_kst": today_kst,
        "pages": {
            "/": html_facts(home_meta, home_text),
            "/posts/": html_facts(index_meta, index_text),
        },
        "posts_index": {
            "post_anchor_count": len(anchors),
            "post_anchors": anchors,
            "newest_anchor": ordered_anchors[0] if ordered_anchors else None,
        },
        "sitemap": {**sitemap_meta, **parse_sitemap(sitemap_text, today_utc, today_kst)},
        "rss": {**rss_meta, **parse_rss(rss_text)},
        "robots": {**robots_meta, **parse_robots(robots_text)},
    }

    # 글 상세 1개: 목록의 최신 글을 우선하고, 목록이 비었으면 sitemap에서 고른다.
    article_path = facts["posts_index"]["newest_anchor"]
    if not article_path:
        for entry in facts["sitemap"]["locs"]:
            loc = entry.get("loc") or ""
            path = loc.replace(args.base_url.rstrip("/"), "", 1)
            if path.startswith("/posts/") and path.rstrip("/") != "/posts":
                article_path = path
                break

    if article_path:
        article_meta, article_text = get(article_path)
        facts["article"] = parse_article(article_meta, article_text)
        facts["article"]["source"] = (
            "posts_index" if facts["posts_index"]["newest_anchor"] else "sitemap"
        )
    else:
        facts["article"] = {
            "url": None,
            "status": None,
            "bytes": 0,
            "attempts": 0,
            "error": "검사할 글 상세 경로를 찾지 못함 (목록 앵커 0개 + sitemap에 글 없음)",
            "has_canonical": False,
            "canonical": None,
            "has_og_title": False,
            "og_title": None,
            "source": None,
        }

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(facts, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    write_step_summary(facts)

    print(f"실측값을 {args.out} 에 기록했습니다.")
    print(
        f"  홈={facts['pages']['/']['status']} "
        f"목록={facts['pages']['/posts/']['status']} "
        f"앵커={facts['posts_index']['post_anchor_count']}개 "
        f"sitemap={facts['sitemap']['status']}/url {facts['sitemap']['url_count']}개 "
        f"rss={facts['rss']['status']}/item {facts['rss']['item_count']}개 "
        f"robots={facts['robots']['status']} "
        f"글상세={facts['article']['status']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
