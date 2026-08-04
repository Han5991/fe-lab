#!/usr/bin/env python3
"""Lighthouse를 여러 번 돌려 "비교 가능한" 사실표 하나로 떨어뜨린다.

claude-lighthouse 워크플로우의 측정 담당이다.

예전에는 모델이 직접 `npx lighthouse`를 돌리고 카테고리 점수의 **절대값**으로
임계치를 판정했다. 그런데 Lighthouse mobile 프리셋의 CPU 스로틀링은 "그 머신
기준 4배 감속"이라, 공유 4 vCPU 러너에서의 4배와 노트북에서의 4배는 절대 성능이
다르다. 그래서 러너 점수가 로컬 브라우저 측정과 크게 어긋났고("Performance 50"
vs 로컬 90+), 판정이 사이트 변화가 아니라 러너 컨디션을 따라다녔다.

그래서 두 가지를 바꿨다.

1. **호스트 독립 지표를 같이 뽑는다.** 미사용 JS 바이트, 총 전송량, 서드파티
   쿠키 개수, 정적 HTML의 `<img>` 개수 — CPU 속도와 무관하게 결정적인 값들이다.
   회귀 판정은 원래 이쪽이 정직하다.
2. **`environment.benchmarkIndex`를 기록하고 베이스라인과 비교한다.** 이 값이
   베이스라인보다 크게 낮으면 "사이트가 느려진 것"이 아니라 "러너가 느렸던 것"
   이므로, 점수는 참고값으로만 쓰라고 사실표에 명시한다(`scores_comparable`).

각 URL을 여러 번 돌려 **중앙값**을 쓴다. 최고값(best-of-N)은 낙관 편향이 있고
분산을 감춘다. 회차별 원값도 그대로 남겨 분산을 볼 수 있게 한다.

베이스라인은 `.github/lighthouse-baseline.json`이다. 없으면 델타 없이 측정만
하고, 다음 회차부터 쓸 수 있도록 제안본을 Step Summary에 찍는다.

사용법:
    python3 .github/scripts/lighthouse-collect.py --out lighthouse-facts.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from xml.etree import ElementTree

USER_AGENT = "fe-lab-lighthouse/1 (+https://github.com/Han5991/fe-lab)"

CATEGORIES = ["performance", "accessibility", "best-practices", "seo"]

# 목록 페이지의 정적 앵커 (site-smoke-collect.py와 같은 규칙).
POST_ANCHOR_RE = re.compile(r"""href=["'](/posts/[^"']*)["']""")
IMG_TAG_RE = re.compile(r"<img[\s>]", re.IGNORECASE)

# Lighthouse 13이 일부 audit을 `*-insight`로 옮겼다. 버전에 따라 어느 쪽이든
# 잡히도록 후보를 나열해 두고 먼저 존재하는 것을 쓴다.
AUDIT_ALIASES = {
    "unused_javascript": ["unused-javascript"],
    "render_blocking": ["render-blocking-resources", "render-blocking-insight"],
    "total_byte_weight": ["total-byte-weight"],
    "third_party_cookies": ["third-party-cookies"],
    "lcp_ms": ["largest-contentful-paint"],
    "fcp_ms": ["first-contentful-paint"],
    "tbt_ms": ["total-blocking-time"],
    "cls": ["cumulative-layout-shift"],
}


def fetch_text(url: str) -> tuple[int | None, str]:
    """원문을 그대로 가져온다. 실패해도 예외를 던지지 않는다."""
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        body = error.read() or b""
        return error.code, body.decode("utf-8", errors="replace")
    except Exception:
        return None, ""


def pick_recent_post_path(base_url: str) -> str | None:
    """목록 페이지의 첫 앵커(= 최신 글). 없으면 sitemap에서 고른다."""
    _, index_html = fetch_text(base_url.rstrip("/") + "/posts/")
    for anchor in POST_ANCHOR_RE.findall(index_html):
        path = re.split(r"[#?]", anchor, maxsplit=1)[0]
        if path.rstrip("/") != "/posts":
            return path

    _, sitemap = fetch_text(base_url.rstrip("/") + "/sitemap.xml")
    try:
        root = ElementTree.fromstring(sitemap)
    except ElementTree.ParseError:
        return None
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] != "loc" or not element.text:
            continue
        path = urllib.parse.urlparse(element.text.strip()).path
        if path.startswith("/posts/") and path.rstrip("/") != "/posts":
            return path
    return None


def audit_value(audits: dict, key: str) -> dict:
    """audit 하나에서 숫자·절감량·점수를 뽑는다. 없으면 전부 None."""
    for audit_id in AUDIT_ALIASES[key]:
        audit = audits.get(audit_id)
        if audit is None:
            continue
        details = audit.get("details") or {}
        items = details.get("items")
        return {
            "id": audit_id,
            "score": audit.get("score"),
            "numeric_value": audit.get("numericValue"),
            "savings_bytes": details.get("overallSavingsBytes"),
            "savings_ms": details.get("overallSavingsMs"),
            "item_count": len(items) if isinstance(items, list) else None,
        }
    return {
        "id": None,
        "score": None,
        "numeric_value": None,
        "savings_bytes": None,
        "savings_ms": None,
        "item_count": None,
    }


def run_lighthouse(url: str, run_index: int) -> dict | None:
    """Lighthouse 1회 실행 결과 JSON을 돌려준다. 실패하면 None."""
    with tempfile.TemporaryDirectory() as workdir:
        output_path = os.path.join(workdir, f"lh-{run_index}.json")
        command = [
            "npx",
            "--yes",
            "lighthouse",
            url,
            "--output=json",
            f"--output-path={output_path}",
            "--chrome-flags=--headless=new --no-sandbox",
            "--quiet",
        ]
        try:
            result = subprocess.run(
                command, capture_output=True, text=True, timeout=600, check=False
            )
        except subprocess.SubprocessError as error:
            print(f"    run {run_index}: 실행 실패 {error}", file=sys.stderr)
            return None

        if not os.path.exists(output_path):
            tail = (result.stderr or result.stdout or "").strip()[-300:]
            print(f"    run {run_index}: 결과 파일 없음. {tail}", file=sys.stderr)
            return None

        with open(output_path, encoding="utf-8") as handle:
            return json.load(handle)


def summarize_report(report: dict) -> dict:
    """리포트 1개에서 판정에 쓸 값만 추린다. 원본은 수 MB라 들고 다니지 않는다."""
    audits = report.get("audits") or {}
    categories = report.get("categories") or {}
    environment = report.get("environment") or {}
    settings = report.get("configSettings") or {}
    throttling = settings.get("throttling") or {}

    return {
        "scores": {
            name: (categories.get(name) or {}).get("score") for name in CATEGORIES
        },
        "audits": {key: audit_value(audits, key) for key in AUDIT_ALIASES},
        "environment": {
            "benchmark_index": environment.get("benchmarkIndex"),
            "host_user_agent": environment.get("hostUserAgent"),
        },
        "settings": {
            "form_factor": settings.get("formFactor"),
            "throttling_method": settings.get("throttlingMethod"),
            "cpu_slowdown": throttling.get("cpuSlowdownMultiplier"),
            "rtt_ms": throttling.get("rttMs"),
            "throughput_kbps": throttling.get("throughputKbps"),
        },
        "lighthouse_version": report.get("lighthouseVersion"),
    }


def median_or_none(values: list) -> float | None:
    numbers = [v for v in values if isinstance(v, (int, float))]
    return statistics.median(numbers) if numbers else None


def measure_url(url: str, runs: int) -> dict:
    """URL 하나를 runs회 측정해 중앙값과 회차별 원값을 남긴다."""
    print(f"  측정: {url} ({runs}회)")
    summaries = []
    for index in range(1, runs + 1):
        report = run_lighthouse(url, index)
        if report is not None:
            summaries.append(summarize_report(report))

    if not summaries:
        return {"url": url, "runs_completed": 0, "error": "모든 회차 실패"}

    scores = {
        name: median_or_none([s["scores"].get(name) for s in summaries])
        for name in CATEGORIES
    }
    audits = {}
    for key in AUDIT_ALIASES:
        audits[key] = {
            "id": summaries[0]["audits"][key]["id"],
            "score": median_or_none([s["audits"][key]["score"] for s in summaries]),
            "numeric_value": median_or_none(
                [s["audits"][key]["numeric_value"] for s in summaries]
            ),
            "savings_bytes": median_or_none(
                [s["audits"][key]["savings_bytes"] for s in summaries]
            ),
            "item_count": median_or_none(
                [s["audits"][key]["item_count"] for s in summaries]
            ),
        }

    # 정적 HTML 자체의 사실 — CPU 속도와 완전히 무관하다.
    status, raw_html = fetch_text(url)

    return {
        "url": url,
        "runs_completed": len(summaries),
        "error": None,
        # 중앙값. 최고값은 낙관 편향이 있어 쓰지 않는다.
        "scores_median": scores,
        "scores_per_run": [s["scores"] for s in summaries],
        "audits_median": audits,
        "raw_html": {
            "status": status,
            "bytes": len(raw_html.encode("utf-8")),
            # 0이면 정적 HTML에 LCP 후보 이미지가 없다는 뜻이다.
            "img_tag_count": len(IMG_TAG_RE.findall(raw_html)),
        },
        "environment": summaries[0]["environment"],
        "settings": summaries[0]["settings"],
        "lighthouse_version": summaries[0]["lighthouse_version"],
    }


def load_baseline(path: str) -> dict | None:
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        print(f"베이스라인을 읽지 못했습니다({error}). 델타 없이 진행합니다.", file=sys.stderr)
        return None


def compute_deltas(pages: list[dict], baseline: dict | None) -> dict:
    """베이스라인 대비 변화량. 점수가 아니라 호스트 독립 지표가 주인공이다."""
    if not baseline:
        return {"available": False, "reason": "베이스라인 파일 없음", "pages": {}}

    baseline_pages = {p["url"]: p for p in baseline.get("pages", [])}
    deltas = {}
    for page in pages:
        base = baseline_pages.get(page["url"])
        if not base or page.get("error"):
            deltas[page["url"]] = None
            continue

        entry = {}
        for key in ("unused_javascript", "total_byte_weight", "third_party_cookies"):
            field = "savings_bytes" if key == "unused_javascript" else "numeric_value"
            if key == "third_party_cookies":
                field = "item_count"
            now = (page["audits_median"].get(key) or {}).get(field)
            then = (base.get("audits_median", {}).get(key) or {}).get(field)
            entry[key] = {
                "now": now,
                "baseline": then,
                "delta": (now - then) if isinstance(now, (int, float)) and isinstance(then, (int, float)) else None,
            }
        entry["img_tag_count"] = {
            "now": page["raw_html"]["img_tag_count"],
            "baseline": base.get("raw_html", {}).get("img_tag_count"),
        }
        deltas[page["url"]] = entry

    return {
        "available": True,
        "baseline_collected_at": baseline.get("collected_at_utc"),
        "pages": deltas,
    }


def assess_comparability(pages: list[dict], baseline: dict | None) -> dict:
    """이번 러너가 베이스라인 때보다 느렸는지. 점수를 믿어도 되는지의 근거."""
    current = next(
        (
            p["environment"]["benchmark_index"]
            for p in pages
            if not p.get("error") and p["environment"].get("benchmark_index")
        ),
        None,
    )
    base_index = (baseline or {}).get("benchmark_index")

    if not isinstance(current, (int, float)) or not isinstance(base_index, (int, float)) or base_index == 0:
        return {
            "benchmark_index": current,
            "baseline_benchmark_index": base_index,
            "delta_pct": None,
            "scores_comparable": None,
            "note": "베이스라인 benchmarkIndex가 없어 점수 비교 가능 여부를 판정할 수 없습니다.",
        }

    delta_pct = (current - base_index) / base_index * 100
    comparable = delta_pct > -20
    return {
        "benchmark_index": current,
        "baseline_benchmark_index": base_index,
        "delta_pct": round(delta_pct, 1),
        "scores_comparable": comparable,
        "note": (
            "러너 CPU가 베이스라인 수준이라 점수를 비교해도 됩니다."
            if comparable
            else "러너 CPU가 베이스라인보다 20% 이상 느립니다. 점수 하락은 "
            "사이트 회귀가 아니라 러너 컨디션일 수 있으니 호스트 독립 지표로 판정하세요."
        ),
    }


def write_step_summary(facts: dict) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return

    comparability = facts["comparability"]
    lines = [
        "## Lighthouse 측정값",
        "",
        f"수집 시각: `{facts['collected_at_utc']}` (UTC) · "
        f"URL당 {facts['runs_per_url']}회 중앙값 · "
        f"Lighthouse {facts['lighthouse_version']}",
        "",
        f"benchmarkIndex: **{comparability['benchmark_index']}** "
        f"(베이스라인 {comparability['baseline_benchmark_index']}, "
        f"델타 {comparability['delta_pct']}%) → "
        f"점수 비교 가능: **{comparability['scores_comparable']}**",
        "",
        comparability["note"],
        "",
        "| URL | Perf | A11y | BP | SEO | 미사용 JS | 총 전송량 | 3P 쿠키 | `<img>` |",
        "| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for page in facts["pages"]:
        if page.get("error"):
            lines.append(f"| `{page['url']}` | 측정 실패: {page['error']} | | | | | | | |")
            continue
        scores = page["scores_median"]
        audits = page["audits_median"]

        def score(name: str) -> str:
            value = scores.get(name)
            return f"{round(value * 100)}" if isinstance(value, (int, float)) else "-"

        def kib(value) -> str:
            return f"{round(value / 1024):,}KiB" if isinstance(value, (int, float)) else "-"

        lines.append(
            f"| `{page['url']}` | {score('performance')} | {score('accessibility')} | "
            f"{score('best-practices')} | {score('seo')} | "
            f"{kib(audits['unused_javascript']['savings_bytes'])} | "
            f"{kib(audits['total_byte_weight']['numeric_value'])} | "
            f"{audits['third_party_cookies']['item_count'] or 0} | "
            f"{page['raw_html']['img_tag_count']} |"
        )

    if not facts["deltas"]["available"]:
        lines += [
            "",
            "> 베이스라인이 없어 델타 판정을 못 했습니다. 아래 값을 "
            "`.github/lighthouse-baseline.json` 으로 커밋하면 다음 회차부터 "
            "변화량으로 판정합니다.",
            "",
            "```json",
            json.dumps(facts["baseline_suggestion"], ensure_ascii=False, indent=2),
            "```",
        ]

    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Lighthouse 측정값 수집")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SITE_BASE_URL", "https://blog.sangwook.dev"),
    )
    parser.add_argument("--out", default="lighthouse-facts.json")
    parser.add_argument(
        "--baseline", default=".github/lighthouse-baseline.json"
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="URL당 실행 횟수. 중앙값을 쓰므로 홀수를 권장",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    paths = ["/", "/posts/"]
    recent = pick_recent_post_path(base_url)
    if recent:
        paths.append(recent)
    else:
        print("최근 글 경로를 찾지 못해 2개 URL만 측정합니다.", file=sys.stderr)

    pages = [measure_url(base_url + path, args.runs) for path in paths]

    baseline = load_baseline(args.baseline)
    comparability = assess_comparability(pages, baseline)

    facts = {
        "collected_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "base_url": base_url,
        "runs_per_url": args.runs,
        "lighthouse_version": next(
            (p.get("lighthouse_version") for p in pages if not p.get("error")), None
        ),
        "pages": pages,
        "comparability": comparability,
        "deltas": compute_deltas(pages, baseline),
    }
    # 베이스라인이 없을 때 사람이 그대로 커밋할 수 있는 형태로 제안한다.
    facts["baseline_suggestion"] = {
        "collected_at_utc": facts["collected_at_utc"],
        "benchmark_index": comparability["benchmark_index"],
        "pages": [
            {
                "url": p["url"],
                "audits_median": p.get("audits_median"),
                "raw_html": p.get("raw_html"),
            }
            for p in pages
            if not p.get("error")
        ],
    }

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(facts, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    write_step_summary(facts)

    print(f"실측값을 {args.out} 에 기록했습니다.")
    for page in pages:
        if page.get("error"):
            print(f"  {page['url']}: 실패 ({page['error']})")
            continue
        scores = page["scores_median"]
        rendered = " ".join(
            f"{name[:4]}={round(scores[name] * 100) if isinstance(scores[name], (int, float)) else '-'}"
            for name in CATEGORIES
        )
        print(f"  {page['url']}: {rendered} img={page['raw_html']['img_tag_count']}")

    failed = [p for p in pages if p.get("error")]
    if len(failed) == len(pages):
        print("모든 URL 측정에 실패했습니다.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
