#!/usr/bin/env python3
"""
Small-scale research scraper scaffold for the anti-shit detector.

Current goal:
- keep the crawl volume intentionally small
- define filters for candidate poor-quality home/lifestyle posts
- save raw candidates for manual review

Usage:
  .venv-scrapling/bin/python scripts/research/scrape_xhs_bad_samples.py --keyword 家居 --limit 20
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from scrapling import Fetcher


KEYWORDS = [
    "家具",
    "家居",
    "装修",
    "收纳",
    "独居",
    "生活方式",
    "小家改造",
    "租房改造",
    "软装",
    "氛围感",
]


@dataclass
class CandidateNote:
    keyword: str
    title: str
    content: str
    image_count: int
    url: str
    passed_basic_filter: bool


def basic_filter(title: str, content: str, image_count: int) -> bool:
    text_len = len((content or "").strip())
    return bool(title.strip()) and image_count >= 1 and 120 <= text_len <= 1200


def extract_candidates(keyword: str, html: str, source_url: str) -> list[CandidateNote]:
    """
    Placeholder parser.

    We intentionally keep this first version conservative:
    - no brittle selector lock-in yet
    - save minimal candidate structure for manual taxonomy work
    """
    text = " ".join(html.split())
    title = keyword
    content = text[:500]
    image_count = text.count("image") or 1
    return [
        CandidateNote(
            keyword=keyword,
            title=title,
            content=content,
            image_count=image_count,
            url=source_url,
            passed_basic_filter=basic_filter(title, content, image_count),
        )
    ]


def iter_keywords(selected: list[str] | None) -> Iterable[str]:
    if selected:
        return selected
    return KEYWORDS


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keyword", action="append", help="keyword to crawl; repeatable")
    parser.add_argument("--limit", type=int, default=20, help="max pages/requests per keyword")
    parser.add_argument(
        "--output",
        default="data/research_output/anti_shit_candidates.jsonl",
        help="jsonl output path",
    )
    parser.add_argument("--delay", type=float, default=2.0, help="delay between requests in seconds")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fetcher = Fetcher(stealthy_headers=False)

    with output_path.open("w", encoding="utf-8") as handle:
        for keyword in iter_keywords(args.keyword):
            for _index in range(args.limit):
                search_url = f"https://www.xiaohongshu.com/search_result?keyword={keyword}"
                response = fetcher.get(search_url)
                if not response.ok:
                    print(f"[warn] fetch failed keyword={keyword} status={response.status}")
                    break
                candidates = extract_candidates(keyword, response.html or "", search_url)
                for item in candidates:
                    handle.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")
                time.sleep(args.delay)
                break

    print(f"saved candidates to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
