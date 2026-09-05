#!/usr/bin/env python3
"""배포된 블로그의 "실측값"을 수집해 JSON 사실표 하나로 떨어뜨린다.

claude-site-smoke 워크플로우의 수집 담당이다. 예전에는 이 일을 Claude가
직접 curl로 했는데, allowed-tools가 `Bash(curl:*)` 접두 매칭이라
`curl ... | grep -c` 같은 조합이 전부 거부됐다. 우회하느라 턴 수와 비용이
계속 늘었고(31턴/11건 → 52턴/21건), 무엇보다 **어떤 항목이 실제로 측정됐는지
로그에 남지 않아** "성공 = 정상"을 신뢰할 수 없었다.

그래서 역할을 나눴다.
  - 이 스크립트: 측정. HTTP 상태·응답 헤더·앵커 개수·lastmod 분포처럼 세면 끝나는 것들
  - Claude:      판정. 저장소 발행 글과의 대조, 회귀 여부, 이슈 작성

기대값을 아는 항목(apex 리다이렉트, 캐시 헤더)은 실측값 옆에 `expected_*`와
`matches`를 나란히 적어 둔다. 그래도 **판정은 아니다** — 어긋나도 exit 0이고,
이슈를 낼지 말지는 Claude가 정한다.

파이썬인 이유는 XML 때문이다. 검사 항목이 sitemap/rss의 **유효성**을 요구하는데
Node에는 XML 파서가 내장돼 있지 않고, 정규식으로 흉내 내면 깨진 XML을 통과시킨다.
파이썬은 표준 라이브러리(ElementTree)로 진짜 파싱을 하므로 러너에 설치할 것이
없다. 저장소의 파이썬은 `.github/scripts/`의 수집기 둘(이 파일과
`post-inventory-collect.py`)뿐이고, 용도는 CI 글루로 한정한다.

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
# 콘텐츠 해시가 박힌 Next 자산 경로. href/src 어느 속성으로 나오든, 프리로드
# 링크로 나오든 다 잡히게 속성 이름을 보지 않고 따옴표 안의 경로만 본다.
# POST_ANCHOR_RE와 같은 이유로 쿼리·프래그먼트를 정규식에서 배제하지 않는다 —
# 배제하면 그런 링크가 매치 자체에서 빠져 표본이 조용히 0개가 된다.
#
# 대신 POST_ANCHOR_RE에는 없는 오염이 하나 있다. 저쪽은 `href=`에 붙어 있어
# RSC 페이로드 안의 `href=\"/posts/…\"`를 애초에 안 잡지만(실측: `/posts/` HTML
# 앵커 45개 중 역슬래시 섞인 것 0개), 이쪽은 따옴표만 보므로 페이로드의
# `\"/_next/static/…js\"`까지 잡고 캡처에 **역슬래시가 딸려 온다**
# (실측: 홈 HTML 매치 76개 중 60개). 그래서 정규화에서 `\`도 함께 떼어 낸다.
STATIC_ASSET_RE = re.compile(r"""["'](/_next/static/[^"']+)["']""")


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
    완전히 죽으면 경로 수(고정 5개 + 글 상세 1개, 홈이 살아 있으면 자산 표본
    3개까지) × 재시도 × 타임아웃이 곱해져 잡 타임아웃을 넘기고, 그러면 이슈도
    못 만든 채 잡만 빨갛게 죽는다. 마감을 넘기면 재시도를 접고 지금까지의
    사실을 그대로 넘긴다.
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
                    "cache_control": response.headers.get("Cache-Control"),
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
                "cache_control": error.headers.get("Cache-Control") if error.headers else None,
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
                "cache_control": None,
                "bytes": 0,
                "attempts": attempt,
                "error": f"{type(error).__name__}: {error}",
            }
            return meta, ""


# apex(sangwook.dev·www) → blog 리다이렉트는 **저장소에 없다.** Cloudflare
# Redirect Rules가 대시보드에서 처리하므로 유닛 테스트가 잡아 주지 않는다.
# 하필 이 판정은 과거 sitemap.xml을 6개월간 404로 만든 자리라, 여기서 실측한다.
#
# 기대 계약: 308로 blog.sangwook.dev의 같은 경로. 단 확장자 없는 경로에는 후행
# 슬래시가 붙고, 파일 경로에는 붙지 않는다(붙으면 정적 호스팅에서 404).
#
# 규칙이 파일인지 아닌지를 가리는 방법은 **확장자 allowlist**다 — path가 `/`나
# 목록에 적힌 확장자로 끝나면 그대로 넘기고, 아니면 슬래시를 붙인다. 목록이
# 규칙 안에 손으로 적혀 있어서 사이트가 목록 밖 확장자를 내보내면 그 파일에
# 슬래시가 붙어 404가 된다. 2026-09-05 실측에서 `.webmanifest`가 그랬다:
# `/site.webmanifest` → 308 → `/site.webmanifest/` → 404. 모든 페이지의 head가
# 참조하는 파일이고, blog 오리진에 직접 요청하면 200이다.
#
# 그때 probe 4개가 전부 목록에 **이미 든** 확장자(xml)나 확장자 없는 경로만
# 밟아서 이 구멍을 못 봤다. 그래서 아래를 분기별로 채워 둔다 — 목록 밖 확장자,
# 목록 안 확장자, 그리고 점이 든 슬러그. 마지막 것은 allowlist 방식을 고른 이유
# 자체다. "점이 있으면 파일"로 판정했다면 `turborepo-next.js-docker` 같은 글이
# 슬래시를 못 받아 깨진다.
APEX_PROBES = [
    {"origin": "https://sangwook.dev", "path": "/", "expect": "https://blog.sangwook.dev/", "why": "루트"},
    {"origin": "https://sangwook.dev", "path": "/about", "expect": "https://blog.sangwook.dev/about/", "why": "확장자 없는 경로 — 슬래시가 붙어야 한다"},
    {"origin": "https://sangwook.dev", "path": "/sitemap.xml", "expect": "https://blog.sangwook.dev/sitemap.xml", "why": "allowlist 안의 확장자 — 슬래시가 붙으면 안 된다"},
    {"origin": "https://www.sangwook.dev", "path": "/", "expect": "https://blog.sangwook.dev/", "why": "www도 같은 규칙을 타는지"},
    {"origin": "https://sangwook.dev", "path": "/site.webmanifest", "expect": "https://blog.sangwook.dev/site.webmanifest", "why": "allowlist 밖 확장자 — 실제로 404가 되던 경로"},
    {"origin": "https://sangwook.dev", "path": "/favicon.ico", "expect": "https://blog.sangwook.dev/favicon.ico", "why": "allowlist 안의 확장자 하나 더 — 파일 분기의 양성 대조"},
    {"origin": "https://sangwook.dev", "path": "/posts/turborepo-next.js-docker", "expect": "https://blog.sangwook.dev/posts/turborepo-next.js-docker/", "why": "점이 든 슬러그지만 파일이 아니라 글 — 슬래시가 붙어야 한다"},
]


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """리다이렉트를 따라가지 않는다 — 상태 코드와 Location 자체가 검사 대상이다."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        return None


def fetch_redirect(url: str) -> dict:
    """리다이렉트를 따라가지 않고 (status, location) 을 본다. 실패해도 안 던진다."""
    opener = urllib.request.build_opener(_NoRedirect)
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"}
    )
    try:
        with opener.open(request, timeout=30) as response:
            return {"url": url, "status": response.status, "location": response.headers.get("Location"), "error": None}
    except urllib.error.HTTPError as error:
        return {"url": url, "status": error.code, "location": error.headers.get("Location") if error.headers else None, "error": None}
    except Exception as error:
        return {"url": url, "status": None, "location": None, "error": f"{type(error).__name__}: {error}"}


def collect_apex() -> dict:
    """apex·www 리다이렉트 실측. 각 항목에 기대값과 일치 여부를 함께 남긴다."""
    results = []
    for probe in APEX_PROBES:
        got = fetch_redirect(probe["origin"] + probe["path"])
        got["why"] = probe["why"]
        got["expected_location"] = probe["expect"]
        got["expected_status"] = 308
        got["matches"] = got["status"] == 308 and got["location"] == probe["expect"]
        results.append(got)
    return {"probes": results, "all_match": all(r["matches"] for r in results)}


# 응답 헤더는 `apps/blog/web/public/_headers`(자산)와 Cloudflare Workers 자산
# 서버의 기본값(HTML)이 낸다. check-seo·check-bundle은 out/의 HTML·JS만 읽고
# `_headers`는 파싱조차 하지 않으므로, 패턴이 오타나 리팩터링으로 깨져도 CI는
# 계속 초록이다. 배포된 응답을 직접 보는 곳은 여기뿐이다.
#
# 자산은 파일명에 콘텐츠 해시가 박혀 낡은 파일이 나갈 경로가 없으니 immutable.
ASSET_CACHE_EXPECT_CONTAINS = ("immutable",)
# HTML은 반대로 immutable이 붙으면 안 된다 — 붙는 순간 새 글 발행이 늦게 반영된다.
HTML_CACHE_EXPECT_CONTAINS = ("max-age=0", "must-revalidate")
HTML_CACHE_EXPECT_ABSENT = ("immutable",)


def pick_static_assets(home_text: str, limit: int = 3) -> list[str]:
    """홈 HTML에서 `/_next/static/` 자산을 확장자별로 하나씩 고른다.

    경로에 콘텐츠 해시가 들어 있어 목록을 여기 적어 둘 수 없다. 확장자마다
    하나씩만 보는 건 `_next/static`을 거는 `_headers` 규칙이 `/_next/static/*`
    하나뿐이라 css든 js든 woff2든 같은 규칙을 타기 때문이다 — 표본이지 전수
    검사가 아니다.

    정규화가 역슬래시까지 떼는 이유는 STATIC_ASSET_RE 주석에 있다. 안 떼면
    `…js\\`가 `js`와 다른 확장자로 세어져 표본 자리를 하나 먹고, 그 경로는
    사이트에 없어 404가 돌아온다.
    """
    normalized = (
        re.split(r"[#?\\]", path, maxsplit=1)[0]
        for path in STATIC_ASSET_RE.findall(home_text)
    )
    picked: dict[str, str] = {}
    for path in dict.fromkeys(normalized):
        basename = path.rsplit("/", 1)[-1]
        extension = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""
        if extension in picked:
            continue
        picked[extension] = path
        if len(picked) >= limit:
            break
    return list(picked.values())


def cache_probe(
    url: str | None,
    status: int | None,
    cache_control: str | None,
    kind: str,
    contains: tuple[str, ...],
    absent: tuple[str, ...],
    error: str | None = None,
) -> dict:
    """Cache-Control 실측값과 기대 토큰의 대조 결과. 어긋나도 예외는 없다.

    헤더만 보면 안 되고 상태 코드도 함께 봐야 한다. `_headers`의 패턴은 파일이
    실제로 있는지와 무관하게 걸려서, 없는 경로의 404 응답에도 규칙이 그대로
    붙는다 — 실측으로 `/_next/static/chunks/<없는파일>.js`가 404를 내면서
    `public, max-age=31536000, immutable`을 달고 왔다. 그런 응답을 통과로 세면
    표본이 조용히 무의미해진다.
    """
    value = (cache_control or "").lower()
    missing = [token for token in contains if token not in value]
    unexpected = [token for token in absent if token in value]
    return {
        "url": url,
        "kind": kind,
        "status": status,
        "cache_control": cache_control,
        "expected_contains": list(contains),
        "expected_absent": list(absent),
        "missing": missing,
        "unexpected": unexpected,
        "matches": (
            error is None
            and status == 200
            and cache_control is not None
            and not missing
            and not unexpected
        ),
        "error": error,
    }


def collect_cache(get, home_text: str, html_pages: list[tuple[str, dict]]) -> dict:
    """자산·HTML의 Cache-Control 실측.

    HTML은 이미 받아 둔 응답의 헤더를 그대로 쓰고, 자산만 새로 가져온다.
    `_headers`에는 프리뷰 URL을 색인에서 빼는 규칙(`*.workers.dev`에
    X-Robots-Tag: noindex)도 있는데, 프리뷰 URL이 PR마다 달라 프로덕션
    도메인에서는 도달할 수 없다 — 여기서는 못 잡는다.
    """
    probes = [
        cache_probe(
            meta.get("url") or path,
            meta.get("status"),
            meta.get("cache_control"),
            "html",
            HTML_CACHE_EXPECT_CONTAINS,
            HTML_CACHE_EXPECT_ABSENT,
            meta.get("error"),
        )
        for path, meta in html_pages
    ]

    assets = pick_static_assets(home_text)
    for asset in assets:
        meta, _ = get(asset)
        probes.append(
            cache_probe(
                meta["url"],
                meta.get("status"),
                meta.get("cache_control"),
                "static-asset",
                ASSET_CACHE_EXPECT_CONTAINS,
                (),
                meta.get("error"),
            )
        )

    return {
        "probes": probes,
        "asset_count": len(assets),
        # 홈 HTML에서 자산을 하나도 못 뽑았다면 검사가 무력화된 것이지 통과가 아니다.
        "all_match": bool(assets) and all(probe["matches"] for probe in probes),
    }


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
    apex = facts["apex"]
    cache = facts["cache"]

    # `<title>`에 `|`가 들어 있으면(실측: `Frontend Lab | 프론트엔드 실험실`) 표의
    # 셀 구분자로 읽혀 홈 행이 셋으로 갈라진다. JSON에는 원문 그대로 남으니
    # 표에 넣는 값만 이스케이프한다.
    home_title = repr(home["title"]).replace("|", "\\|")

    lines = [
        "## 수집된 실측값",
        "",
        f"대상: `{facts['base_url']}` / 수집 시각: `{facts['checked_at_utc']}` (UTC)",
        "",
        "| 항목 | 실측값 |",
        "| :--- | :--- |",
        f"| 홈 `/` | HTTP {home['status']} · {home['bytes']:,} bytes · title={home_title} |",
        f"| 목록 `/posts/` | HTTP {index['status']} · {index['bytes']:,} bytes |",
        f"| `/posts/` 정적 앵커 | {facts['posts_index']['post_anchor_count']}개 |",
        f"| apex 리다이렉트 | {'정상' if apex['all_match'] else '⚠️ 불일치'} "
        f"({sum(1 for p in apex['probes'] if p['matches'])}/{len(apex['probes'])}) |",
        f"| 캐시 헤더 | {'정상' if cache['all_match'] else '⚠️ 불일치'} "
        f"({sum(1 for p in cache['probes'] if p['matches'])}/{len(cache['probes'])}) "
        f"· 자산 표본 {cache['asset_count']}개 |",
        f"| `/sitemap.xml` | HTTP {sitemap['status']} · XML {'유효' if sitemap['xml_valid'] else '무효'} · url {sitemap['url_count']}개 |",
        f"| lastmod 분포 | 서로 다른 날짜 {sitemap['distinct_lastmod_count']}종 · 전부 검사당일={sitemap['all_lastmod_is_check_date']} |",
        f"| `/rss.xml` | HTTP {rss['status']} · XML {'유효' if rss['xml_valid'] else '무효'} · item {rss['item_count']}개 |",
        f"| `/robots.txt` | HTTP {robots['status']} · sitemap 참조={robots['references_sitemap']} |",
        f"| 글 상세 | HTTP {article['status']} · canonical={article['has_canonical']} · og:title={article['has_og_title']} |",
        "",
        f"검사한 글 상세: `{article.get('url')}`",
    ]

    # 개수만으로는 어느 probe가 어긋났는지 안 보인다. 어긋난 것만 이어 붙인다.
    mismatched_apex = [probe for probe in apex["probes"] if not probe["matches"]]
    if mismatched_apex:
        lines += ["", "### 어긋난 apex probe", ""]
        for probe in mismatched_apex:
            lines.append(
                f"- `{probe['url']}` ({probe['why']}) — "
                f"실측 {probe['status']} → `{probe['location']}` / "
                f"기대 {probe['expected_status']} → `{probe['expected_location']}`"
            )

    mismatched_cache = [probe for probe in cache["probes"] if not probe["matches"]]
    if mismatched_cache:
        lines += ["", "### 어긋난 캐시 헤더", ""]
        for probe in mismatched_cache:
            lines.append(
                f"- `{probe['url']}` ({probe['kind']}) — "
                f"HTTP {probe['status']} · 실측 `{probe['cache_control']}` / "
                f"없는 토큰 {probe['missing']} · 있으면 안 되는 토큰 {probe['unexpected']}"
            )

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

    # 블로그 자신이 아니라 apex 도메인을 본다(base_url과 무관하게 고정).
    apex = collect_apex()

    cache = collect_cache(
        get, home_text, [("/", home_meta), ("/posts/", index_meta)]
    )

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
        "apex": apex,
        "cache": cache,
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
        f"글상세={facts['article']['status']} "
        f"apex={sum(1 for p in facts['apex']['probes'] if p['matches'])}"
        f"/{len(facts['apex']['probes'])} "
        f"캐시={sum(1 for p in facts['cache']['probes'] if p['matches'])}"
        f"/{len(facts['cache']['probes'])}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
