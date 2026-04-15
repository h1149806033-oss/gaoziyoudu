#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES_PATH = ROOT / 'scripts' / 'research' / 'anti_shit_rules.json'
OUTPUT_PATH = ROOT / 'data' / 'research_output' / 'xhs_manual_samples.jsonl'
SEEN_PATH = ROOT / 'data' / 'research_output' / 'xhs_manual_seen.txt'

DATE_PREFIX_RE = re.compile(r'^(编辑于\s*)?(\d{2}-\d{2}|\d{4}-\d{2}-\d{2}|\d+天前|昨天|今天)')
IMAGE_COUNTER_RE = re.compile(r'^1/(\d+)$')
COMMENTS_RE = re.compile(r'^共\s*(\d+)\s*条评论')
NUMBER_RE = re.compile(r'^(\d+(?:\.\d+)?(?:万)?)$')

@dataclass
class NoteSample:
    title: str
    author: str
    content: str
    url: str
    image_count: int
    publish_meta: str
    likes_visible: str
    collects_visible: str
    comments_visible: str
    valid_sample: bool
    poop_score: int
    poop_candidate: bool
    poop_reasons: list[str] = field(default_factory=list)


def run_osascript(script: str) -> str:
    result = subprocess.run(['osascript', '-e', script], check=True, capture_output=True, text=True)
    return result.stdout.strip()


def chrome_js(js: str) -> str:
    return run_osascript(f'tell application "Google Chrome" to execute active tab of front window javascript "{js}"')


def current_tab() -> tuple[str, str]:
    raw = run_osascript('tell application "Google Chrome" to get {title of active tab of front window, URL of active tab of front window}')
    if ', ' not in raw:
        return '', raw
    title, url = raw.split(', ', 1)
    return title.strip(), url.strip()


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


def extract_engagement(lines: list[str]) -> tuple[str, str, str]:
    for idx, line in enumerate(lines):
        if line == '发送' and idx >= 3:
            candidates = lines[idx - 3: idx]
            if all(NUMBER_RE.fullmatch(item) for item in candidates):
                return candidates[0], candidates[1], candidates[2]
    return '', '', ''


def parse_note(page_title: str, body_text: str, url: str, rules: dict) -> NoteSample | None:
    page_title = page_title.replace(' - 小红书', '').strip()
    lines = [line.strip() for line in body_text.splitlines() if line.strip()]
    counter_index = next((i for i, line in enumerate(lines) if IMAGE_COUNTER_RE.fullmatch(line)), None)
    if counter_index is None:
        return None
    image_count = int(IMAGE_COUNTER_RE.fullmatch(lines[counter_index]).group(1))
    title = lines[counter_index + 1].strip() if counter_index + 1 < len(lines) else page_title
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
    likes, collects, comments = extract_engagement(lines)
    valid = is_valid_sample(title, content, image_count, rules)
    poop_score, reasons = compute_poop_score(title, content, rules)
    return NoteSample(title, author, content, url, image_count, publish_meta, likes, collects, comments, valid, poop_score, poop_score >= 60, reasons)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=int, default=20)
    parser.add_argument('--poll', type=float, default=2.0)
    args = parser.parse_args()

    rules = json.loads(RULES_PATH.read_text(encoding='utf-8'))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    seen = set(SEEN_PATH.read_text(encoding='utf-8').splitlines()) if SEEN_PATH.exists() else set()
    collected = 0

    print('打开小红书详情页，我会自动收正文和互动数据。按 Ctrl+C 结束。', flush=True)
    while collected < args.target:
        page_title, url = current_tab()
        if '/explore/' not in url or url in seen:
            time.sleep(args.poll)
            continue
        body = chrome_js('document.body.innerText.slice(0,12000)')
        sample = parse_note(page_title, body, url, rules)
        seen.add(url)
        SEEN_PATH.write_text('\n'.join(sorted(seen)) + ('\n' if seen else ''), encoding='utf-8')
        if sample and sample.valid_sample:
            with OUTPUT_PATH.open('a', encoding='utf-8') as handle:
                handle.write(json.dumps(asdict(sample), ensure_ascii=False) + '\n')
            collected += 1
            print(f'[saved] {collected:02d} {sample.title[:40]} | ❤ {sample.likes_visible} ☆ {sample.collects_visible} 💬 {sample.comments_visible}', flush=True)
        else:
            print(f'[skip] {page_title[:40]}', flush=True)
        time.sleep(args.poll)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
