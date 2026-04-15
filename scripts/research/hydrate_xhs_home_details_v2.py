#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES_PATH = ROOT / 'scripts' / 'research' / 'anti_shit_rules.json'
CARDS_PATH = ROOT / 'data' / 'research_output' / 'xhs_home_cards_v2.tsv'
OUTPUT_PATH = ROOT / 'data' / 'research_output' / 'xhs_home_samples_v2.jsonl'

DATE_PREFIX_RE = re.compile(r'^(编辑于\s*)?(\d{2}-\d{2}|\d{4}-\d{2}-\d{2}|\d+天前|昨天|今天)')
IMAGE_COUNTER_RE = re.compile(r'^1/(\d+)$')
COMMENTS_RE = re.compile(r'^共\s*(\d+)\s*条评论')

@dataclass
class NoteSample:
    keyword: str
    title: str
    author: str
    content: str
    url: str
    image_count: int
    publish_meta: str
    card_footer: str
    valid_sample: bool
    poop_score: int
    poop_candidate: bool
    poop_reasons: list[str] = field(default_factory=list)


def run_osascript(script: str) -> str:
    result = subprocess.run(['osascript', '-e', script], check=True, capture_output=True, text=True)
    return result.stdout.strip()


def chrome_js(js: str) -> str:
    return run_osascript(f'tell application "Google Chrome" to execute active tab of front window javascript "{js}"')


def open_url(url: str) -> None:
    run_osascript(f'tell application "Google Chrome" to set URL of active tab of front window to "{url}"')


def current_url() -> str:
    return run_osascript('tell application "Google Chrome" to get URL of active tab of front window')


def wait_for_note_page(max_wait: int = 12) -> bool:
    for _ in range(max_wait):
        url = current_url()
        if '/explore/' in url and 'xsec_token=' in url:
            body = chrome_js('document.body.innerText.slice(0,800)')
            if re.search(r'1/\d+', body):
                return True
        time.sleep(1)
    return False


def extract_note_text() -> tuple[str, str]:
    title = run_osascript('tell application "Google Chrome" to get title of active tab of front window')
    body = chrome_js('document.body.innerText.slice(0,12000)')
    return title, body


def is_valid_sample(title: str, content: str, image_count: int, rules: dict) -> bool:
    valid_rules = rules['valid_sample']
    title_len = len(title.strip())
    content_len = len(content.strip())
    if image_count < valid_rules['min_images']:
        return False
    if content_len < valid_rules['min_content_chars'] or content_len > valid_rules['max_content_chars']:
        return False
    if title_len < valid_rules['min_title_chars'] or title_len > valid_rules['max_title_chars']:
        return False
    lowered = f"{title}\n{content}"
    return not any(term in lowered for term in valid_rules['exclude_terms'])


def compute_poop_score(title: str, content: str, rules: dict) -> tuple[int, list[str]]:
    signals = rules['poop_signals']
    text = f"{title}\n{content}"
    fluff_hits = [term for term in signals['fluff_phrases'] if term in text]
    concrete_hits = [term for term in signals['concrete_phrases'] if term in text]
    bait_hits = [term for term in signals['bait_phrases'] if term in text]
    score = 30 + len(fluff_hits) * 12 + len(bait_hits) * 10 - len(concrete_hits) * 8
    reasons: list[str] = []
    if fluff_hits:
        reasons.append(f"空话词偏多：{'、'.join(fluff_hits[:4])}")
    if bait_hits:
        reasons.append(f"标题 / 口号味重：{'、'.join(bait_hits[:3])}")
    if len(concrete_hits) <= 1:
        reasons.append('可执行细节偏少')
    return max(0, min(100, score)), reasons


def parse_note_text(keyword: str, page_title: str, body_text: str, url: str, footer: str, rules: dict) -> NoteSample | None:
    page_title = page_title.replace(' - 小红书', '').strip()
    lines = [line.strip() for line in body_text.splitlines() if line.strip()]
    counter_index = next((i for i, line in enumerate(lines) if IMAGE_COUNTER_RE.fullmatch(line)), None)
    if counter_index is None or counter_index + 1 >= len(lines):
        return None
    image_count = int(IMAGE_COUNTER_RE.fullmatch(lines[counter_index]).group(1))
    title = lines[counter_index + 1].strip()
    if page_title and page_title in lines[counter_index:counter_index + 5]:
        title = page_title
    author = lines[counter_index - 1] if counter_index > 0 else ''
    content_lines = []
    publish_meta = ''
    for line in lines[counter_index + 2:]:
        if DATE_PREFIX_RE.match(line):
            publish_meta = line
            break
        if COMMENTS_RE.match(line):
            break
        content_lines.append(line)
    content = '\n'.join(content_lines).strip()
    valid = is_valid_sample(title, content, image_count, rules)
    poop_score, poop_reasons = compute_poop_score(title, content, rules)
    return NoteSample(keyword, title, author, content, url, image_count, publish_meta, footer, valid, poop_score, poop_score >= 60, poop_reasons)


def load_cards() -> list[dict]:
    rows = []
    with CARDS_PATH.open('r', encoding='utf-8') as handle:
        reader = csv.reader(handle, delimiter='\t')
        for row in reader:
            if len(row) >= 5:
                rows.append({'keyword': row[0], 'href': row[1], 'cover_href': row[2], 'title': row[3], 'footer': row[4]})
    dedup = {}
    for row in rows:
        dedup[row['cover_href']] = row
    return list(dedup.values())


def hydrate(target: int) -> list[NoteSample]:
    rules = json.loads(RULES_PATH.read_text(encoding='utf-8'))
    cards = load_cards()
    samples = []
    for card in cards:
        if len(samples) >= target:
            break
        print(f"[open] {card['title'][:24]}", flush=True)
        open_url(card['cover_href'])
        if not wait_for_note_page():
            print(f"[skip-open] {card['title'][:24]}", flush=True)
            continue
        page_title, body = extract_note_text()
        sample = parse_note_text(card['keyword'], page_title, body, current_url(), card['footer'], rules)
        if sample and sample.valid_sample:
            samples.append(sample)
            print(f"[ok] {len(samples):03d} {sample.title[:40]}", flush=True)
        else:
            print(f"[skip-parse] {page_title[:30]}", flush=True)
    return samples


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=int, default=20)
    args = parser.parse_args()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    samples = hydrate(args.target)
    with OUTPUT_PATH.open('w', encoding='utf-8') as handle:
        for sample in samples:
            handle.write(json.dumps(asdict(sample), ensure_ascii=False) + '\n')
    print(f'saved {len(samples)} valid samples to {OUTPUT_PATH}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
