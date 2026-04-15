import type { DetectorCategory } from "./types";
import { EXAMPLE_DRAFTS } from "./examples";

export interface AntiShitDraft {
  category: DetectorCategory;
  title: string;
  content: string;
  sourceUrl: string;
  imageCount: number;
}

const STORAGE_KEY = "anti_shit_draft_v1";

export function createDefaultDraft(category: DetectorCategory = "home"): AntiShitDraft {
  return {
    category,
    title: EXAMPLE_DRAFTS[category].title,
    content: EXAMPLE_DRAFTS[category].content,
    sourceUrl: "",
    imageCount: 0,
  };
}

export function loadDraft(): AntiShitDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultDraft();
    const parsed = JSON.parse(raw) as Partial<AntiShitDraft>;
    const category = parsed.category === "lifestyle" ? "lifestyle" : "home";
    return {
      category,
      title: typeof parsed.title === "string" ? parsed.title : EXAMPLE_DRAFTS[category].title,
      content: typeof parsed.content === "string" ? parsed.content : EXAMPLE_DRAFTS[category].content,
      sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : "",
      imageCount: typeof parsed.imageCount === "number" ? parsed.imageCount : 0,
    };
  } catch {
    return createDefaultDraft();
  }
}

export function saveDraft(draft: AntiShitDraft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}
