export type DetectorCategory = "home" | "lifestyle";

export type FailureTag =
  | "fake_howto"
  | "fake_healing"
  | "fake_effortless"
  | "empty_framework"
  | "template_smell"
  | "title_bait"
  | "image_carries_text"
  | "ai_blandness";

export type DimensionKey =
  | "fluffiness"
  | "template_smell"
  | "title_bait"
  | "low_information_density"
  | "image_text_mismatch"
  | "ai_tone";

export interface DetectorInput {
  category: DetectorCategory;
  title: string;
  content: string;
  imageCount: number;
}

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  score: number;
}

export interface DetectorIssue {
  tag: FailureTag;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface DetectorSuggestion {
  title: string;
  action: string;
}

export interface DetectorReport {
  trashIndex: number;
  grade: "Mild" | "Serious" | "Hopeless";
  tags: FailureTag[];
  dimensionScores: DimensionScore[];
  issues: DetectorIssue[];
  summary: string;
  suggestions: DetectorSuggestion[];
}
