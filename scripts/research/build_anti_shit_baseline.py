#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CARDS_PATH = ROOT / 'data' / 'research_output' / 'xhs_home_cards.tsv'
SAMPLES_PATH = ROOT / 'data' / 'research_output' / 'xhs_manual_samples.jsonl'
OUTPUT_PATH = ROOT / 'data' / 'research_output' / 'anti_shit_baseline.json'

TRACK_TERMS = [
    '改造', '高级感', '抄作业', '治愈', '氛围感', 'Dream house', '普通人', '尽力了',
    '幸福感', '松弛感', '人见人夸', '终于', '清单', '预算', '尺寸', '步骤'
]


def load_card_titles() -> list[str]:
    titles = []
    seen = set()
    with CARDS_PATH.open('r', encoding='utf-8') as handle:
        reader = csv.reader(handle, delimiter='\t')
        for row in reader:
            if len(row) < 3:
                continue
            url = row[1]
            title = row[2].strip()
            if not title or url in seen:
                continue
            seen.add(url)
            titles.append(title)
    return titles


def load_samples() -> list[dict]:
    if not SAMPLES_PATH.exists():
        return []
    return [json.loads(line) for line in SAMPLES_PATH.read_text(encoding='utf-8').splitlines() if line.strip()]


def main() -> int:
    titles = load_card_titles()
    samples = load_samples()
    term_counts = {term: sum(1 for title in titles if term in title) for term in TRACK_TERMS}
    top_titles = sorted(titles, key=len, reverse=True)[:20]
    baseline = {
        'title_pool_count': len(titles),
        'hydrated_sample_count': len(samples),
        'tracked_term_counts': term_counts,
        'top_long_titles': top_titles,
        'title_patterns': {
            'question_like': sum(1 for title in titles if '？' in title or '?' in title),
            'exclamation_like': sum(1 for title in titles if '！' in title or '!' in title),
            'contains_number': sum(1 for title in titles if any(ch.isdigit() for ch in title)),
            'contains_dream_house': term_counts['Dream house'],
            'contains_copywriting_bait': term_counts['抄作业'] + term_counts['普通人'] + term_counts['人见人夸'],
            'contains_mood_words': term_counts['氛围感'] + term_counts['治愈'] + term_counts['高级感'] + term_counts['松弛感'],
        },
        'sample_stats': {
            'avg_content_chars': round(sum(len(item.get('content', '')) for item in samples) / len(samples), 1) if samples else 0,
            'avg_poop_score': round(sum(item.get('poop_score', 0) for item in samples) / len(samples), 1) if samples else 0,
            'poop_candidate_count': sum(1 for item in samples if item.get('poop_candidate')),
            'avg_visible_likes': round(sum(_parse_count(item.get('likes_visible', '0')) for item in samples) / len(samples), 1) if samples else 0,
            'avg_visible_collects': round(sum(_parse_count(item.get('collects_visible', '0')) for item in samples) / len(samples), 1) if samples else 0,
            'avg_visible_comments': round(sum(_parse_count(item.get('comments_visible', '0')) for item in samples) / len(samples), 1) if samples else 0,
        },
        'taxonomy_hypothesis': [
            '假干货型',
            '假治愈型',
            '模板拼贴型',
            '标题诈骗型',
            '图好文烂型'
        ]
    }
    OUTPUT_PATH.write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote baseline to {OUTPUT_PATH}')
    return 0


def _parse_count(value: str) -> float:
    text = (value or '').strip()
    if not text:
        return 0.0
    if text.endswith('万'):
        try:
            return float(text[:-1]) * 10000
        except ValueError:
            return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


if __name__ == '__main__':
    raise SystemExit(main())
