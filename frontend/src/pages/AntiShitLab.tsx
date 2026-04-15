import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Chip, Divider, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import logoMark from "../assets/logo-mark.svg";
import { evaluateAntiShitDraft } from "../anti-shit/evaluate";
import { loadDraft, saveDraft, type AntiShitDraft } from "../anti-shit/draft";
import { CATEGORY_OPTIONS } from "../anti-shit/examples";
import { DIMENSION_LABELS, FAILURE_TAG_LABELS } from "../anti-shit/taxonomy";
import { poisonPalette, poopLevel, scoreColor } from "../anti-shit/ui";
import type { DetectorCategory } from "../anti-shit/types";
import { showToast } from "../components/Toast";
import { grokAnalyze } from "../utils/api";

function scoreDescriptor(score: number) {
  if (score >= 85) return "臭到熏人";
  if (score >= 70) return "臭味很冲";
  if (score >= 55) return "开始冒味";
  if (score >= 35) return "轻微返味";
  return "暂时没馊";
}

function normalizeDraft(input: Partial<AntiShitDraft> | null | undefined): AntiShitDraft {
  const fallback = loadDraft();
  return {
    category: input?.category === "lifestyle" ? "lifestyle" : input?.category === "home" ? "home" : fallback.category,
    title: typeof input?.title === "string" ? input.title : fallback.title,
    content: typeof input?.content === "string" ? input.content : fallback.content,
    sourceUrl: typeof input?.sourceUrl === "string" ? input.sourceUrl : fallback.sourceUrl,
    imageCount: typeof input?.imageCount === "number" ? input.imageCount : fallback.imageCount,
  };
}

export default function AntiShitLab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState<AntiShitDraft>(() => normalizeDraft(location.state as Partial<AntiShitDraft> | undefined));
  const [grokExpanded, setGrokExpanded] = useState(false);
  const [grokText, setGrokText] = useState("预留中：下一步接入 Grok。");
  const [grokLoading, setGrokLoading] = useState(false);

  useEffect(() => {
    document.title = "稿子有毒 · 深度尸检";
  }, []);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const report = useMemo(
    () =>
      evaluateAntiShitDraft({
        category: draft.category,
        title: draft.title,
        content: draft.content,
        imageCount: draft.imageCount,
      }),
    [draft],
  );

  const poopCount = poopLevel(report.trashIndex);

  const setCategory = (category: DetectorCategory) => setDraft((current) => ({ ...current, category }));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: poisonPalette.bg,
        color: poisonPalette.text,
        backgroundImage:
          "radial-gradient(circle at 20% 0%, rgba(255,111,0,0.16), transparent 22%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
      }}
    >
      <Box sx={{ maxWidth: 1240, mx: "auto", px: { xs: 2, md: 3 }, py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/anti-shit")} sx={{ color: poisonPalette.text }}>
            返回录入台
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box component="img" src={logoMark} alt="稿子有毒" sx={{ width: 34, height: 34 }} />
            <Typography sx={{ fontWeight: 900, fontSize: 20 }}>深度尸检</Typography>
          </Box>
          <Chip
            label={`💩 ${poopCount}/5`}
            sx={{ bgcolor: poisonPalette.accent, color: "#111", fontWeight: 900, borderRadius: "999px" }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "420px 1fr" }, gap: 2 }}>
          <Box sx={{ border: `1px solid ${poisonPalette.line}`, bgcolor: poisonPalette.panel, p: 2 }}>
            <Stack spacing={1.5}>
              <Typography sx={{ color: poisonPalette.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>
                案件原件
              </Typography>
              <Stack direction="row" spacing={1}>
                {CATEGORY_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    onClick={() => setCategory(option.value)}
                    sx={{
                      bgcolor: draft.category === option.value ? poisonPalette.accent : "transparent",
                      color: draft.category === option.value ? "#111" : poisonPalette.acid,
                      border: `1px solid ${poisonPalette.muted}`,
                      fontWeight: 800,
                    }}
                  />
                ))}
              </Stack>
              <TextField
                fullWidth
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="标题"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: poisonPalette.text,
                    bgcolor: "rgba(255,255,255,0.02)",
                    "& fieldset": { borderColor: poisonPalette.muted, borderWidth: "2px" },
                    "&:hover fieldset": { borderColor: poisonPalette.acid },
                    "&.Mui-focused fieldset": { borderColor: poisonPalette.accent },
                  },
                }}
              />
              <TextField
                fullWidth
                multiline
                minRows={12}
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                placeholder="正文"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: poisonPalette.text,
                    bgcolor: "rgba(255,255,255,0.02)",
                    "& fieldset": { borderColor: poisonPalette.muted, borderWidth: "2px" },
                    "&:hover fieldset": { borderColor: poisonPalette.acid },
                    "&.Mui-focused fieldset": { borderColor: poisonPalette.accent },
                  },
                }}
              />
              <TextField
                fullWidth
                value={draft.sourceUrl}
                onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))}
                placeholder="来源链接（可选）"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#A7AEC2",
                    bgcolor: "rgba(255,255,255,0.02)",
                    "& fieldset": { borderColor: poisonPalette.muted, borderWidth: "2px" },
                    "&:hover fieldset": { borderColor: poisonPalette.acid },
                    "&.Mui-focused fieldset": { borderColor: poisonPalette.accent },
                  },
                }}
              />
            </Stack>
          </Box>

          <Box sx={{ border: `1px solid ${poisonPalette.line}`, bgcolor: poisonPalette.panel, p: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 2 }}>
                <Box sx={{ border: `2px solid ${poisonPalette.accent}`, p: 1.5, bgcolor: "#171717" }}>
                  <Typography sx={{ color: poisonPalette.muted, fontSize: 12, fontWeight: 700 }}>烂文指数</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 1, mt: 0.5 }}>
                    <Typography sx={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: scoreColor(report.trashIndex) }}>
                      {report.trashIndex}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: poisonPalette.muted, mb: 0.5 }}>
                      {scoreDescriptor(report.trashIndex)}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1, p: 1, border: `1px dashed ${poisonPalette.line}`, bgcolor: "rgba(255,255,255,0.02)", transform: "rotate(-1deg)" }}>
                    <Stack direction="row" spacing={0.35}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Typography key={index} sx={{ fontSize: 18, opacity: index < poopCount ? 1 : 0.18, transform: index % 2 ? "translateY(-2px)" : "translateY(2px)" }}>
                          💩
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14, mb: 0.75 }}>💩检报告</Typography>
                  <Typography sx={{ fontSize: 30, lineHeight: 1.4, fontWeight: 900 }}>
                    {report.summary}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14, mb: 1 }}>臭味标签</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                  {report.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={FAILURE_TAG_LABELS[tag]}
                      sx={{
                        height: "auto",
                        py: 0.75,
                        justifyContent: "center",
                        bgcolor: poisonPalette.tagBg,
                        color: poisonPalette.acid,
                        border: `1px solid #5C5C5C`,
                        fontWeight: 800,
                        width: "100%",
                        "& .MuiChip-label": {
                          display: "block",
                          whiteSpace: "normal",
                          textAlign: "center",
                          lineHeight: 1.25,
                          paddingInline: 1.25,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Divider sx={{ borderColor: poisonPalette.line }} />

              <Box>
                <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14, mb: 1.25 }}>污染分布</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
                  {report.dimensionScores.map((item) => (
                    <Box key={item.key} sx={{ border: `1px solid ${poisonPalette.line}`, p: 1.25, bgcolor: "#171717", minHeight: 118 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{DIMENSION_LABELS[item.key]}</Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 900, color: scoreColor(item.score) }}>{item.score}</Typography>
                      </Box>
                      <Box sx={{ fontSize: 28, lineHeight: 1, mb: 0.75 }}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Box
                            key={index}
                            component="span"
                            sx={{
                              opacity: index < poopLevel(item.score) ? 1 : 0.14,
                              mr: 0.25,
                              display: "inline-block",
                              transform: index % 2 ? "rotate(-6deg)" : "rotate(6deg)",
                            }}
                          >
                            •
                          </Box>
                        ))}
                      </Box>
                      <Typography sx={{ color: poisonPalette.muted, fontSize: 12, lineHeight: 1.6 }}>
                        {item.score >= 75
                          ? "这块味道最重，属于一眼就能闻出来的问题。"
                          : item.score >= 55
                            ? "这块已经开始冒味，继续放着会更糟。"
                            : "这块暂时还没完全发酵。"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider sx={{ borderColor: poisonPalette.line }} />

              <Box>
                <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14, mb: 1.25 }}>主要罪状</Typography>
                <Stack spacing={1}>
                  {report.issues.map((issue) => (
                    <Box key={`${issue.tag}-${issue.title}`} sx={{ border: `1px solid ${poisonPalette.line}`, p: 1.5, bgcolor: "#171717" }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 900, mb: 0.4 }}>{issue.title}</Typography>
                      <Typography sx={{ color: "#C7C1B7", fontSize: 13, lineHeight: 1.7 }}>{issue.description}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ borderColor: poisonPalette.line }} />

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14 }}>毒舌窗口</Typography>
                  <Button
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    onClick={async () => {
                      const next = !grokExpanded;
                      setGrokExpanded(next);
                      if (!next) return;
                      setGrokLoading(true);
                      try {
                        const result = await grokAnalyze({
                          title: draft.title,
                          content: draft.content,
                          category: draft.category,
                          trash_index: report.trashIndex,
                          summary: report.summary,
                          tags: report.tags.map((tag) => FAILURE_TAG_LABELS[tag]),
                          issues: report.issues.map((issue) => issue.description),
                        });
                        setGrokText(result.analysis);
                        showToast("Grok 已开口");
                      } catch (error) {
                        console.error("grok analyze failed", error);
                        setGrokText("Grok 这会儿没出声，但规则层已经把臭味抓住了。先从最装的那句下手。");
                        showToast("Grok 暂时没回话");
                      } finally {
                        setGrokLoading(false);
                      }
                    }}
                    sx={{ color: poisonPalette.acid }}
                  >
                    {grokExpanded ? "收起" : "展开"}
                  </Button>
                </Box>
                <Box sx={{ border: `1px dashed #5C5C5C`, p: 1.25, color: poisonPalette.muted, fontSize: 13, lineHeight: 1.7 }}>
                  {grokExpanded
                    ? (grokLoading ? "Grok 正在组织语言，准备补刀……" : grokText)
                    : "预留中：下一步接入 Grok。"}
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
