/**
 * API 请求工具
 */
import axios from "axios";
import { FALLBACK_REPORT } from "./fallback";

export const STATIC_DEMO_MODE = import.meta.env.VITE_STATIC_DEMO === "1";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (STATIC_DEMO_MODE ? "http://127.0.0.1:8000/api" : "/api");

/**
 * 完整诊断（多轮 Agent + 可选视频）耗时常达数分钟；须与 Diagnosing 页等待上限一致。
 * 可在 frontend/.env 中设置 `VITE_DIAGNOSE_MAX_WAIT_MS`（毫秒）。
 */
export const DIAGNOSE_CLIENT_MAX_MS = (() => {
  const n = Number(import.meta.env.VITE_DIAGNOSE_MAX_WAIT_MS);
  return Number.isFinite(n) && n > 0 ? n : 600_000;
})();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
});

const DEMO_BASELINES: Record<string, { category_cn: string; avg_title_length: number; viral_avg_title_length: number; avg_tag_count: number; viral_rate: number; }> = {
  food: { category_cn: "美食", avg_title_length: 18, viral_avg_title_length: 22, avg_tag_count: 6, viral_rate: 14.8 },
  fashion: { category_cn: "穿搭", avg_title_length: 14, viral_avg_title_length: 18, avg_tag_count: 5, viral_rate: 12.3 },
  tech: { category_cn: "科技", avg_title_length: 19, viral_avg_title_length: 24, avg_tag_count: 4, viral_rate: 10.5 },
  travel: { category_cn: "旅行", avg_title_length: 17, viral_avg_title_length: 21, avg_tag_count: 6, viral_rate: 11.7 },
  beauty: { category_cn: "美妆", avg_title_length: 16, viral_avg_title_length: 20, avg_tag_count: 5, viral_rate: 13.1 },
  fitness: { category_cn: "健身", avg_title_length: 15, viral_avg_title_length: 18, avg_tag_count: 4, viral_rate: 9.8 },
  lifestyle: { category_cn: "生活", avg_title_length: 18, viral_avg_title_length: 22, avg_tag_count: 4, viral_rate: 8.9 },
  home: { category_cn: "家居", avg_title_length: 17, viral_avg_title_length: 21, avg_tag_count: 5, viral_rate: 10.2 },
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeCategory(category: string) {
  return DEMO_BASELINES[category] ? category : "food";
}

function buildDemoPreScore(params: {
  title: string; content: string; category: string; tags: string; image_count: number;
}): PreScoreResult {
  const category = normalizeCategory(params.category);
  const meta = DEMO_BASELINES[category];
  const tagCount = params.tags.split(",").map((tag) => tag.trim()).filter(Boolean).length;
  const titleLen = params.title.trim().length;
  const contentLen = params.content.trim().length;

  const dimensions = {
    title_quality: Math.max(48, Math.min(92, 52 + titleLen * 1.6)),
    content_quality: Math.max(45, Math.min(90, 46 + Math.min(contentLen, 240) * 0.12)),
    visual_quality: Math.max(50, Math.min(88, 54 + params.image_count * 6)),
    tag_strategy: Math.max(42, Math.min(90, 44 + tagCount * 7)),
    engagement_potential: 0,
  };
  dimensions.engagement_potential = Math.round(
    dimensions.title_quality * 0.24 +
    dimensions.content_quality * 0.2 +
    dimensions.visual_quality * 0.24 +
    dimensions.tag_strategy * 0.18 +
    12
  );
  const total = Math.round(
    (dimensions.title_quality +
      dimensions.content_quality +
      dimensions.visual_quality +
      dimensions.tag_strategy +
      dimensions.engagement_potential) / 5
  );

  return {
    total_score: total,
    dimensions,
    weights: {
      title_quality: 0.22,
      content_quality: 0.2,
      visual_quality: 0.24,
      tag_strategy: 0.14,
      engagement_potential: 0.2,
    },
    level: total >= 85 ? "A" : total >= 70 ? "B" : "C",
    baseline: {
      avg_engagement: 8200,
      median: 1700,
      viral_threshold: 18000,
      sample_size: 874,
    },
    category,
    category_cn: meta.category_cn,
  };
}

function buildDemoReport(params: Partial<DiagnoseParams>): DiagnoseResult {
  const title = params.title?.trim();
  const content = params.content?.trim();
  const category = normalizeCategory(params.category || "food");
  const preScore = buildDemoPreScore({
    title: title || "这篇笔记值得再打磨一下",
    content: content || FALLBACK_REPORT.optimized_content || "",
    category,
    tags: params.tags || "",
    image_count: params.coverImages?.length ?? (params.coverImage ? 1 : 0),
  });

  return {
    ...FALLBACK_REPORT,
    overall_score: preScore.total_score,
    grade: preScore.level,
    radar_data: {
      content: Math.round(preScore.dimensions.content_quality),
      visual: Math.round(preScore.dimensions.visual_quality),
      growth: Math.round(preScore.dimensions.tag_strategy),
      user_reaction: Math.round(preScore.dimensions.engagement_potential),
      overall: preScore.total_score,
    },
    optimized_title: title
      ? `${title.replace(/[！!]+$/u, "")}｜静态演示版优化`
      : FALLBACK_REPORT.optimized_title,
    optimized_content: content
      ? `${content}\n\n---\n静态演示版说明：这里展示的是前端本地生成的示例优化结果，正式上线后可接入真实多 Agent 诊断。`
      : FALLBACK_REPORT.optimized_content,
  };
}

function buildDemoOptimizeResult(params: {
  title: string;
  content: string;
  overall_score: number;
}): OptimizeResult {
  const baseTitle = params.title.trim() || "这篇笔记";
  const baseContent = params.content.trim() || "补充更多细节，会让读者更容易代入。";
  const scoreA = Math.min(96, Math.max(params.overall_score + 6, 74));
  const scoreB = Math.min(93, Math.max(params.overall_score + 4, 71));
  const scoreC = Math.min(91, Math.max(params.overall_score + 3, 69));

  return {
    original_score: params.overall_score,
    plans: [
      {
        strategy: "提升点击率",
        optimized_title: `${baseTitle}｜加数字 + 加结果感`,
        optimized_content: `${baseContent}\n\n先说结果，再给步骤，把最想让人收藏的内容提前到前两段。`,
        key_changes: "标题加入结果感，正文先结论后过程",
        score: scoreA,
        score_delta: scoreA - params.overall_score,
        recommended: true,
      },
      {
        strategy: "强化真实感",
        optimized_title: `${baseTitle}｜把个人体验写得更具体`,
        optimized_content: `${baseContent}\n\n补一段亲测前后对比，顺带保留一个小瑕疵，会让内容更像真实分享。`,
        key_changes: "补充使用场景与前后对比",
        score: scoreB,
        score_delta: scoreB - params.overall_score,
      },
      {
        strategy: "增强互动率",
        optimized_title: `${baseTitle}｜评论区更容易接话的版本`,
        optimized_content: `${baseContent}\n\n结尾增加一个更具体的问题，让读者更容易表达自己的选择或分歧。`,
        key_changes: "在结尾增加互动提问",
        score: scoreC,
        score_delta: scoreC - params.overall_score,
      },
    ],
  };
}

/**
 * 探测本机后端是否经 Vite 代理可达（与快识/诊断是否「网络问题」无关，只测到 API 进程）。
 */
export async function getApiHealth(): Promise<boolean> {
  if (STATIC_DEMO_MODE) {
    return false;
  }
  try {
    const { data } = await api.get<{ ok?: boolean; status?: string }>("/health", { timeout: 5000 });
    return data?.ok === true || data?.status === "ok";
  } catch {
    return false;
  }
}

export interface DiagnoseParams {
  title: string;
  content: string;
  category: string;
  tags: string;
  coverImage?: File;
  coverImages?: File[];
  videoFile?: File;
}

export interface AgentOpinion {
  agent_name: string;
  dimension: string;
  score: number;
  issues: string[];
  suggestions: string[];
  reasoning: string;
  debate_comments: string[];
}

export interface SimulatedComment {
  username: string;
  avatar_emoji?: string;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
  likes?: number;
  time_ago?: string;
  ip_location?: string;
  is_author?: boolean;
}

export interface DebateEntry {
  round: number;
  agent_name: string;
  kind: "agree" | "rebuttal" | "add";
  text: string;
}

export interface CoverDirection {
  layout: string;
  color_scheme: string;
  text_style: string;
  tips: string[];
}

export interface DiagnoseResult {
  overall_score: number;
  grade: string;
  radar_data: Record<string, number>;
  agent_opinions: AgentOpinion[];
  issues: Array<{ severity: string; description: string; from_agent: string }>;
  suggestions: Array<{
    priority: number;
    description: string;
    expected_impact: string;
  }>;
  debate_summary: string;
  debate_timeline: DebateEntry[];
  simulated_comments: SimulatedComment[];
  optimized_title?: string;
  optimized_content?: string;
  cover_direction?: CoverDirection;
}

/**
 * 提交笔记进行诊断
 */
export async function diagnoseNote(
  params: DiagnoseParams
): Promise<DiagnoseResult> {
  if (STATIC_DEMO_MODE) {
    await wait(600);
    return buildDemoReport(params);
  }
  const formData = new FormData();
  formData.append("title", params.title);
  formData.append("content", params.content);
  formData.append("category", params.category);
  formData.append("tags", params.tags);
  if (params.coverImage) {
    formData.append("cover_image", params.coverImage);
  }
  if (params.coverImages && params.coverImages.length > 0) {
    params.coverImages.forEach((file) => formData.append("cover_images", file));
  }
  if (params.videoFile) {
    formData.append("video_file", params.videoFile);
  }

  const { data } = await api.post<DiagnoseResult>("/diagnose", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: DIAGNOSE_CLIENT_MAX_MS,
  });
  return data;
}

/**
 * Model A 即时预评分（<50ms，无 LLM 调用）
 */
export interface PreScoreResult {
  total_score: number;
  dimensions: Record<string, number>;
  weights: Record<string, number>;
  level: string;
  baseline: { avg_engagement: number; median: number; viral_threshold: number; sample_size: number };
  category: string;
  category_cn: string;
}

export async function preScore(params: {
  title: string; content: string; category: string; tags: string; image_count: number;
}): Promise<PreScoreResult> {
  if (STATIC_DEMO_MODE) {
    await wait(120);
    return buildDemoPreScore(params);
  }
  const fd = new FormData();
  fd.append("title", params.title);
  fd.append("content", params.content);
  fd.append("category", params.category);
  fd.append("tags", params.tags);
  fd.append("image_count", String(params.image_count));
  const { data } = await api.post<PreScoreResult>("/pre-score", fd);
  return data;
}

/**
 * SSE 流式诊断
 */
export type StreamEvent =
  | { type: "pre_score"; data: PreScoreResult & { title: string } }
  | { type: "progress"; data: { step: string; message: string } }
  | { type: "result"; data: DiagnoseResult }
  | { type: "error"; data: { message: string } };

export async function diagnoseStream(
  params: DiagnoseParams,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (STATIC_DEMO_MODE) {
    const pre = buildDemoPreScore({
      title: params.title,
      content: params.content,
      category: params.category,
      tags: params.tags,
      image_count: params.coverImages?.length ?? (params.coverImage ? 1 : 0),
    });
    onEvent({ type: "pre_score", data: { ...pre, title: params.title } });
    const steps = [
      ["parse_start", "正在整理标题、正文和素材结构"],
      ["baseline_done", "正在比对垂类样本与历史爆款特征"],
      ["round1_start", "4 位虚拟专家正在形成第一轮判断"],
      ["debate_agent_1", "专家之间正在互相质疑和补充证据"],
      ["judge_done", "综合裁判正在汇总结论"],
      ["finalizing", "正在生成静态演示报告"],
    ] as const;
    for (const [step, message] of steps) {
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      await wait(260);
      onEvent({ type: "progress", data: { step, message } });
    }
    await wait(260);
    onEvent({ type: "result", data: buildDemoReport(params) });
    return;
  }
  const fd = new FormData();
  fd.append("title", params.title);
  fd.append("content", params.content);
  fd.append("category", params.category);
  fd.append("tags", params.tags);
  if (params.coverImage) fd.append("cover_image", params.coverImage);
  if (params.coverImages) params.coverImages.forEach((f) => fd.append("cover_images", f));
  if (params.videoFile) fd.append("video_file", params.videoFile);

  const response = await fetch("/api/diagnose-stream", { method: "POST", body: fd, signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  /** 必须在多次 read() 之间保留：TCP 常把 `event:` 与 `data:` 拆到不同 chunk，重置会导致永远收不到 result */
  let pendingEvent = "";

  const processSseLines = (lines: string[]) => {
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        pendingEvent = line.slice(7).trim();
      } else if (line.startsWith("data:") && pendingEvent) {
        const payload = line.slice(5).trimStart();
        try {
          const data = JSON.parse(payload);
          onEvent({ type: pendingEvent, data } as StreamEvent);
        } catch (e) {
          if (pendingEvent === "result") {
            console.error(
              "[diagnoseStream] result 的 data 行 JSON 解析失败（可能过大或截断）",
              e,
            );
          }
        }
        pendingEvent = "";
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      processSseLines(lines);
    }
    if (done) break;
  }
  if (buffer.trim()) {
    processSseLines(buffer.split("\n"));
  }
}

/**
 * 获取垂类 baseline 概览
 */
export async function getBaseline(category: string) {
  if (STATIC_DEMO_MODE) {
    const meta = DEMO_BASELINES[normalizeCategory(category)];
    return {
      category,
      stats: {
        avg_title_length: meta.avg_title_length,
        viral_avg_title_length: meta.viral_avg_title_length,
        avg_tag_count: meta.avg_tag_count,
        viral_rate: meta.viral_rate,
      },
    };
  }
  const { data } = await api.get(`/baseline/${category}`);
  return data;
}

/**
 * 生成更多模拟评论
 */
export interface CommentWithReplies extends SimulatedComment {
  replies?: SimulatedComment[];
}

export async function generateComments(params: {
  title: string;
  content: string;
  category: string;
  existing_count: number;
}): Promise<CommentWithReplies[]> {
  if (STATIC_DEMO_MODE) {
    await wait(180);
    return [
      {
        username: "认真看完的人",
        avatar_emoji: "📝",
        comment: `如果你把「${params.title || "标题"}」里的结果感再写具体一点，我会更想收藏。`,
        sentiment: "positive",
        likes: 37,
      },
      {
        username: "路过但被种草",
        avatar_emoji: "✨",
        comment: "这版已经挺顺了，封面再强一点会更想点开。",
        sentiment: "neutral",
        likes: 18,
      },
    ];
  }
  const { data } = await api.post<{ comments: CommentWithReplies[] }>(
    "/generate-comments",
    params
  );
  return data.comments;
}

// --------------- 迭代优化 ---------------

export interface OptimizePlan {
  strategy: string;
  optimized_title: string;
  optimized_content: string;
  key_changes: string;
  score: number;
  score_delta: number;
  recommended?: boolean;
}

export interface OptimizeResult {
  original_score: number;
  plans: OptimizePlan[];
}

export interface GrokAnalyzeParams {
  title: string;
  content: string;
  category: string;
  trash_index: number;
  summary: string;
  tags: string[];
  issues: string[];
}

export interface GrokAnalyzeResult {
  analysis: string;
  model: string;
}

export async function optimizeDiagnosis(params: {
  title: string;
  content: string;
  category: string;
  issues: string;
  suggestions: string;
  overall_score: number;
}): Promise<OptimizeResult> {
  if (STATIC_DEMO_MODE) {
    await wait(360);
    return buildDemoOptimizeResult(params);
  }
  const { data } = await api.post<OptimizeResult>("/optimize", params);
  return data;
}

export async function grokAnalyze(params: GrokAnalyzeParams): Promise<GrokAnalyzeResult> {
  if (STATIC_DEMO_MODE && API_BASE_URL === "http://127.0.0.1:8000/api") {
    // still try backend first for local testing; fallback only if unavailable
    try {
      const { data } = await api.post<GrokAnalyzeResult>("/grok-analyze", params, { timeout: 90_000 });
      return data;
    } catch {
      return {
        analysis:
          `这稿子最大的问题不是没审美，是没兑现。标题像在喊口号，正文像在拖延交作业。\n` +
          `你现在这股${params.tags.join("、") || "空话"}味儿已经飘出来了，再不收，读者会直接划走。\n` +
          `去味儿建议：先删掉最装的两句，再补一个真场景、一个真细节、一个真结果。`,
        model: "mock-grok",
      };
    }
  }
  const { data } = await api.post<GrokAnalyzeResult>("/grok-analyze", params, { timeout: 90_000 });
  return data;
}

// --------------- 历史记录 ---------------

export interface HistoryListItem {
  id: string;
  title: string;
  category: string;
  overall_score: number;
  grade: string;
  created_at: string;
}

export interface HistoryDetail extends HistoryListItem {
  report: DiagnoseResult;
}

/**
 * @param params - title, category, report(完整 DiagnoseResult)
 * @returns {id: string}
 */
export async function saveHistory(params: {
  title: string;
  category: string;
  report: DiagnoseResult;
}): Promise<{ id: string }> {
  const { data } = await api.post<{ id: string }>("/history", params);
  return data;
}

/**
 * @param limit - 每页条数
 * @param offset - 偏移量
 */
export async function getHistoryList(
  limit = 20,
  offset = 0
): Promise<HistoryListItem[]> {
  const { data } = await api.get<HistoryListItem[]>("/history", {
    params: { limit, offset },
  });
  return data;
}

/**
 * @param id - 记录 UUID
 */
export async function getHistoryDetail(id: string): Promise<HistoryDetail> {
  const { data } = await api.get<HistoryDetail>(`/history/${id}`);
  return data;
}

/**
 * @param id - 记录 UUID
 */
export async function deleteHistory(id: string): Promise<void> {
  await api.delete(`/history/${id}`);
}

// --------------- 截图分析 ---------------

export type SlotType = "cover" | "content" | "profile" | "comments";

export interface QuickRecognizeResult {
  success: boolean;
  /** image=截图快识；video=视频快识（标题应另传封面/标题截图） */
  media_source?: "image" | "video";
  slot_type: string;
  extra_slots?: string[];
  category: string;
  title?: string;
  content_text?: string;
  summary: string;
  confidence?: number;
  error?: string;
  publisher?: { name: string; follower_count: string };
  engagement_signal?: {
    likes_visible: number;
    collects_visible: number;
    comments_visible: number;
    is_high_engagement: boolean;
  };
}

export interface DeepAnalysisResult {
  scenario: string;
  slot_count: number;
  extra_text: string;
  video_info: { filename: string; size_mb: number; content_type: string } | null;
  analyses: Record<string, Record<string, unknown>>;
  overall: {
    completeness: number;
    scenario: string;
    tips: string[];
    slots_analyzed: string[];
  };
}

/**
 * 上传单张截图进行 AI 快速识别
 * @param file - 图片文件
 * @param slotHint - 位置提示
 */
export async function quickRecognize(
  file: File,
  slotHint?: SlotType
): Promise<QuickRecognizeResult> {
  if (STATIC_DEMO_MODE) {
    await wait(180);
    return {
      success: true,
      media_source: "image",
      slot_type: slotHint || "content",
      extra_slots: [],
      category: slotHint === "profile" ? "lifestyle" : "food",
      title: slotHint === "content" ? "静态演示模式：请手动补充标题" : "",
      content_text: slotHint === "content" ? "静态演示模式不会真实 OCR，请把想分析的正文手动补进右侧表单。" : "",
      summary: "已接收截图，当前为静态演示版，建议手动校对识别结果。",
      confidence: 0.82,
    };
  }
  const fd = new FormData();
  fd.append("file", file);
  if (slotHint) fd.append("slot_hint", slotHint);
  const { data } = await api.post<QuickRecognizeResult>(
    "/screenshot/quick-recognize",
    fd,
    {
      headers: { "Content-Type": "multipart/form-data" },
      /** 视觉 60s + OCR，与后端留余量 */
      timeout: 180_000,
    },
  );
  return data;
}

/**
 * 上传视频进行 AI 快识（全片或抽帧），返回结构与 quickRecognize 一致
 * @param file - 视频文件（mp4 / webm / quicktime）
 */
export async function quickRecognizeVideo(file: File): Promise<QuickRecognizeResult> {
  if (STATIC_DEMO_MODE) {
    await wait(260);
    return {
      success: true,
      media_source: "video",
      slot_type: "content",
      extra_slots: [],
      category: "lifestyle",
      summary: `已接收视频「${file.name}」，静态演示版不会做真实视频理解，请手动补充标题和正文。`,
      content_text: "静态演示版不会调用视频识别模型，请以手动输入为准。",
      confidence: 0.76,
    };
  }
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<QuickRecognizeResult>(
    "/screenshot/quick-recognize-video",
    fd,
    {
      headers: { "Content-Type": "multipart/form-data" },
      /** 视频快识包含整段 STT，长视频可能需要数分钟 */
      timeout: 600_000,
    }
  );
  return data;
}

/**
 * 提交完整图包进行深度分析
 * @param params - 包含 scenario 和各维度截图
 */
export async function deepAnalyze(params: {
  scenario: "pre_publish" | "post_publish";
  cover?: File;
  contentImg?: File;
  profile?: File;
  comments?: File;
  video?: File;
  extraText?: string;
}): Promise<DeepAnalysisResult> {
  if (STATIC_DEMO_MODE) {
    await wait(400);
    return {
      scenario: params.scenario === "pre_publish" ? "发布前分析" : "发布后复盘",
      slot_count: [params.cover, params.contentImg, params.profile, params.comments].filter(Boolean).length,
      extra_text: params.extraText || "",
      video_info: params.video ? {
        filename: params.video.name,
        size_mb: Math.round((params.video.size / 1024 / 1024) * 10) / 10,
        content_type: params.video.type,
      } : null,
      analyses: {
        cover: {
          title: "封面吸引力",
          summary: "静态演示版认为这组素材适合强化标题区和主体对比度。",
          suggestions: ["把关键信息放到前 20% 视线区域", "保留 1 个最核心视觉重点"],
        },
        content: {
          title: "正文结构",
          summary: "建议把结论前置，再补 2-3 个更具体的细节。",
          suggestions: ["第一段直接说结果", "中间补使用场景", "结尾加互动问题"],
        },
      },
      overall: {
        completeness: params.scenario === "pre_publish" ? 78 : 72,
        scenario: params.scenario === "pre_publish" ? "发布前分析" : "发布后复盘",
        tips: [
          "静态演示版不会调用真实模型，适合展示流程与交互。",
          "正式版可把这套界面接回真实截图与视频分析链路。",
        ],
        slots_analyzed: ["cover", "content"],
      },
    };
  }
  const fd = new FormData();
  fd.append("scenario", params.scenario);
  if (params.cover) fd.append("cover", params.cover);
  if (params.contentImg) fd.append("content_img", params.contentImg);
  if (params.profile) fd.append("profile", params.profile);
  if (params.comments) fd.append("comments", params.comments);
  if (params.video) fd.append("video", params.video);
  if (params.extraText) fd.append("extra_text", params.extraText);
  const { data } = await api.post<DeepAnalysisResult>(
    "/screenshot/deep-analyze",
    fd,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 180000 }
  );
  return data;
}

/**
 * 过滤文本中的链接
 */
export async function stripLinks(text: string): Promise<string> {
  if (STATIC_DEMO_MODE) {
    return text.replace(/https?:\/\/\S+/gi, "").trim();
  }
  const fd = new FormData();
  fd.append("text", text);
  const { data } = await api.post<{ cleaned: string }>("/text/strip-links", fd);
  return data.cleaned;
}

export default api;
