import { ACTION_SIGNALS, CATEGORY_KEYWORDS, DIMENSION_LABELS, FAILURE_TAG_LABELS, FAKE_AUTHORITY_PHRASES, FLUFF_PHRASES } from "./taxonomy";
import type { DetectorInput, DetectorIssue, DetectorReport, DetectorSuggestion, DimensionKey, DimensionScore, FailureTag } from "./types";

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countMatches(text: string, terms: string[]) {
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function splitParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function computeDimensionScores(input: DetectorInput): Record<DimensionKey, number> {
  const title = input.title.trim();
  const content = input.content.trim();
  const normalized = `${title}\n${content}`;
  const paragraphs = splitParagraphs(content);
  const fluffHits = countMatches(normalized, FLUFF_PHRASES);
  const authorityHits = countMatches(normalized, FAKE_AUTHORITY_PHRASES);
  const actionHits = countMatches(normalized, ACTION_SIGNALS);
  const categoryHits = countMatches(normalized, CATEGORY_KEYWORDS[input.category]);
  const digitHits = (normalized.match(/\d+/g) ?? []).length;
  const exclamationHits = (normalized.match(/[!！]/g) ?? []).length;
  const emojiHits = (normalized.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []).length;
  const sentenceCount = Math.max(1, content.split(/[。！？!?]/).filter(Boolean).length);
  const averageSentenceLength = content.length / sentenceCount;

  return {
    fluffiness: clamp(28 + fluffHits * 12 + authorityHits * 9 - actionHits * 5),
    template_smell: clamp(20 + authorityHits * 14 + emojiHits * 5 + exclamationHits * 4 - Math.min(categoryHits, 4) * 3),
    title_bait: clamp(18 + (title.length < 8 ? 18 : 0) + (title.length > 28 ? 12 : 0) + (digitHits > 0 ? 8 : 0) + exclamationHits * 4 - actionHits * 3),
    low_information_density: clamp(64 - digitHits * 8 - actionHits * 7 - categoryHits * 5 + fluffHits * 5 + (paragraphs.length <= 1 ? 10 : 0)),
    image_text_mismatch: clamp(32 + (input.imageCount >= 4 ? 12 : 0) + (content.length < 180 ? 18 : 0) - categoryHits * 4),
    ai_tone: clamp(18 + fluffHits * 9 + authorityHits * 10 + (averageSentenceLength > 38 ? 12 : 0) + (paragraphs.length <= 1 ? 8 : 0)),
  };
}

function deriveTags(scores: Record<DimensionKey, number>): FailureTag[] {
  const tags: FailureTag[] = [];
  if (scores.low_information_density >= 72) tags.push("fake_howto");
  if (scores.fluffiness >= 68) tags.push("fake_healing");
  if (scores.template_smell >= 68) tags.push("template_smell");
  if (scores.title_bait >= 66) tags.push("title_bait");
  if (scores.image_text_mismatch >= 64) tags.push("image_carries_text");
  if (scores.ai_tone >= 66) tags.push("ai_blandness");
  if (scores.fluffiness >= 62 && scores.template_smell >= 62) tags.push("fake_effortless");
  if (scores.low_information_density >= 62 && scores.ai_tone >= 60) tags.push("empty_framework");
  return Array.from(new Set(tags));
}

function buildIssues(tags: FailureTag[]): DetectorIssue[] {
  const issues: DetectorIssue[] = [];
  for (const tag of tags) {
    const issue: DetectorIssue = {
      tag,
      title: FAILURE_TAG_LABELS[tag],
      description: "",
      severity: "medium",
    };
    switch (tag) {
      case "fake_howto":
        issue.description = "正文看起来像在教人，但缺少步骤、约束条件和可验证细节。";
        issue.severity = "high";
        break;
      case "fake_healing":
        issue.description = "情绪词很多，但没有足够生活细节支撑“治愈 / 幸福感”这个结论。";
        break;
      case "fake_effortless":
        issue.description = "整篇在表演一种轻松高级的状态，却没有真实的使用场景和摩擦感。";
        break;
      case "empty_framework":
        issue.description = "像是在讲方法论，但读完拿不走任何可立即执行的东西。";
        issue.severity = "high";
        break;
      case "template_smell":
        issue.description = "套话和现成表达太多，像把热门模板词拼在了一起。";
        break;
      case "title_bait":
        issue.description = "标题做了强承诺，但正文对这个承诺兑现不够。";
        issue.severity = "high";
        break;
      case "image_carries_text":
        issue.description = "图片在撑场面，文字承担的解释和结论部分偏弱。";
        break;
      case "ai_blandness":
        issue.description = "句子很顺但没有棱角，像被抹平过的人造表达。";
        break;
    }
    issues.push(issue);
  }

  if (issues.length === 0) {
    issues.push({
      tag: "fake_howto",
      title: "轻度空泛",
      description: "目前没有明显灾难点，但信息密度还不够高，离有用内容有差距。",
      severity: "low",
    });
  }
  return issues;
}

function buildSuggestions(input: DetectorInput, tags: FailureTag[]): DetectorSuggestion[] {
  const suggestions: DetectorSuggestion[] = [];
  if (tags.includes("title_bait")) {
    suggestions.push({
      title: "缩标题承诺",
      action: "把标题里的大结论改小一档，让正文能真正接住。",
    });
  }
  if (tags.includes("fake_howto") || tags.includes("empty_framework")) {
    suggestions.push({
      title: "补硬信息",
      action: "至少补 3 个能拿走的东西：步骤、预算、尺寸、材料、前后对比，任选其三。",
    });
  }
  if (tags.includes("fake_healing") || tags.includes("fake_effortless")) {
    suggestions.push({
      title: "补生活摩擦",
      action: "别只写感受，补一段真实问题、限制条件或失败经验，让文章落地。",
    });
  }
  if (tags.includes("image_carries_text")) {
    suggestions.push({
      title: "让文字配得上图片",
      action: "针对每组图片补一句它到底解决了什么问题，而不是只说好看。",
    });
  }
  if (tags.includes("ai_blandness") || tags.includes("template_smell")) {
    suggestions.push({
      title: "删模板词",
      action: "把“氛围感 / 狠狠 / 谁懂 / 高级感”之类的空词先删一半，再重写句子。",
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      title: "加可验证细节",
      action: `围绕${input.category === "home" ? "家居改造" : "生活方式"}补更多具体场景和结果，让内容更像真实经验。`,
    });
  }
  return suggestions.slice(0, 4);
}

export function evaluateAntiShitDraft(input: DetectorInput): DetectorReport {
  const scores = computeDimensionScores(input);
  const tags = deriveTags(scores);
  const dimensionScores: DimensionScore[] = Object.entries(scores).map(([key, score]) => ({
    key: key as DimensionKey,
    label: DIMENSION_LABELS[key as DimensionKey],
    score,
  }));
  const trashIndex = clamp(dimensionScores.reduce((sum, item) => sum + item.score, 0) / dimensionScores.length);
  const grade: DetectorReport["grade"] =
    trashIndex >= 78 ? "Hopeless" : trashIndex >= 58 ? "Serious" : "Mild";
  const issues = buildIssues(tags);
  const suggestions = buildSuggestions(input, tags);

  return {
    trashIndex,
    grade,
    tags,
    dimensionScores,
    issues,
    summary:
      grade === "Hopeless"
        ? "这篇内容现在最像一篇会浪费读者时间的模板化空文。"
        : grade === "Serious"
          ? "这篇内容有明显问题，主要不是不会写，而是没有把信息真正写出来。"
          : "这篇内容还没到灾难级，但已经开始露出空和套的倾向了。",
    suggestions,
  };
}
