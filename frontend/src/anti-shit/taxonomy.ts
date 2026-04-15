import type { DetectorCategory, DimensionKey, FailureTag } from "./types";

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  fluffiness: "空洞度",
  template_smell: "模板味",
  title_bait: "标题诈骗度",
  low_information_density: "信息密度不足",
  image_text_mismatch: "图文割裂度",
  ai_tone: "AI 腔浓度",
};

export const FAILURE_TAG_LABELS: Record<FailureTag, string> = {
  fake_howto: "假干货型",
  fake_healing: "假治愈型",
  fake_effortless: "假松弛型",
  empty_framework: "空方法论型",
  template_smell: "模板拼贴型",
  title_bait: "标题诈骗型",
  image_carries_text: "图好文烂型",
  ai_blandness: "AI 口水型",
};

export const CATEGORY_KEYWORDS: Record<DetectorCategory, string[]> = {
  home: ["家具", "家居", "装修", "收纳", "软装", "小家", "房间", "客厅", "卧室", "改造"],
  lifestyle: ["独居", "生活", "日常", "松弛", "治愈", "vlog", "routine", "幸福感", "慢生活", "仪式感"],
};

export const FLUFF_PHRASES = [
  "狠狠",
  "真的太",
  "高级感",
  "氛围感",
  "松弛感",
  "治愈",
  "幸福感",
  "绝绝子",
  "谁懂",
  "被狠狠拿捏",
];

export const FAKE_AUTHORITY_PHRASES = [
  "我悟了",
  "普通人直接抄作业",
  "闭眼入",
  "直接照搬",
  "建议所有人",
  "一定要学会",
];

export const ACTION_SIGNALS = [
  "步骤",
  "做法",
  "预算",
  "材料",
  "尺寸",
  "价格",
  "清单",
  "对比",
  "前后",
  "注意",
];
