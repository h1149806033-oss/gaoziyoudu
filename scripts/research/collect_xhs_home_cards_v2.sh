#!/bin/zsh
set -e
OUT=/Users/howar/Desktop/Noterx/data/research_output/xhs_home_cards_v2.tsv
mkdir -p /Users/howar/Desktop/Noterx/data/research_output
: > "$OUT"
keywords=(家居 家具 装修 收纳 小家改造 租房改造 软装 家居生活 家居博主 独居小家 客厅布置 卧室布置 卧室 客厅 书房 餐厅 房间布置 老破小 旧房改造 精装房 爆改出租屋 客厅改造)
for kw in $keywords; do
  osascript -e "tell application \"Google Chrome\" to set URL of active tab of front window to \"https://www.xiaohongshu.com/search_result?keyword=${kw}&type=51\""
  sleep 3
  for i in 1 2 3 4; do
    osascript -e 'tell application "Google Chrome" to execute active tab of front window javascript "window.scrollTo(0, document.body.scrollHeight); \"ok\""' >/dev/null
    sleep 2
  done
  osascript -e 'tell application "Google Chrome" to execute active tab of front window javascript "(function(){var items=Array.from(document.querySelectorAll(\"section.note-item\")).map(function(section){var hidden=section.querySelector(\"a[href*=\\\"/explore/\\\"]\");var cover=section.querySelector(\"a.cover.mask.ld\");var href=hidden?hidden.href:\"\";var coverHref=cover?cover.href:\"\";var title=((hidden && (hidden.innerText||\"\").trim()) || (((section.innerText||\"\").trim().split(\"\\n\")[0])||\"\")).trim();var footer=((section.querySelector(\".footer\")&&section.querySelector(\".footer\").innerText)||section.innerText||\"\").trim().replace(/\\n+/g,\" | \" );return [href,coverHref,title,footer].join(\"\\t\");}).filter(function(line){return line && line.indexOf(\"/explore/\")>=0;}); return items.join(\"\\n\");})()"' | while IFS=$'\t' read -r href coverHref title footer; do
    if [[ -n "$href" && -n "$coverHref" && -n "$title" ]]; then
      printf '%s\t%s\t%s\t%s\t%s\n' "$kw" "$href" "$coverHref" "$title" "$footer" >> "$OUT"
    fi
  done
  echo "[done] $kw"
done
