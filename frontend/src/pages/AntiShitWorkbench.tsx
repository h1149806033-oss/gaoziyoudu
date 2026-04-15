import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import HistoryIcon from "@mui/icons-material/History";
import logoMark from "../assets/logo-mark.svg";
import { evaluateAntiShitDraft } from "../anti-shit/evaluate";
import { saveDraft } from "../anti-shit/draft";
import { CATEGORY_OPTIONS, EXAMPLE_DRAFTS } from "../anti-shit/examples";
import { FAILURE_TAG_LABELS } from "../anti-shit/taxonomy";
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

export default function AntiShitWorkbench() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const grokRef = useRef<HTMLDivElement | null>(null);
  const [category, setCategory] = useState<DetectorCategory>("home");
  const [title, setTitle] = useState(EXAMPLE_DRAFTS.home.title);
  const [content, setContent] = useState(EXAMPLE_DRAFTS.home.content);
  const [sourceUrl, setSourceUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [grokText, setGrokText] = useState("点右边的按钮，让它先骂一句。");
  const [grokLoading, setGrokLoading] = useState(false);

  useEffect(() => {
    document.title = "稿子有毒";
  }, []);

  useEffect(() => {
    saveDraft({
      category,
      title,
      content,
      sourceUrl,
      imageCount: files.length,
    });
  }, [category, title, content, sourceUrl, files.length]);

  const report = useMemo(
    () =>
      evaluateAntiShitDraft({
        category,
        title,
        content,
        imageCount: files.length,
      }),
    [category, title, content, files.length],
  );

  const poopCount = poopLevel(report.trashIndex);

  const loadExample = () => {
    const example = EXAMPLE_DRAFTS[category];
    setTitle(example.title);
    setContent(example.content);
    setSourceUrl("");
    setFiles([]);
    showToast("已塞入一篇可疑样本");
  };

  const clearAll = () => {
    setTitle("");
    setContent("");
    setSourceUrl("");
    setFiles([]);
    showToast("案件已清空");
  };

  const exportSnapshot = async () => {
    const payload = JSON.stringify(
      {
        draft: { category, title, content, sourceUrl, imageCount: files.length },
        report,
      },
      null,
      2,
    );
    await navigator.clipboard.writeText(payload);
    showToast("已复制当前尸检结果");
  };

  const openLab = () => {
    navigate("/anti-shit/lab", {
      state: { category, title, content, sourceUrl, imageCount: files.length },
    });
  };

  const openGrokWindow = async () => {
    grokRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setGrokLoading(true);
    try {
      const result = await grokAnalyze({
        title,
        content,
        category,
        trash_index: report.trashIndex,
        summary: report.summary,
        tags: report.tags.map((tag) => FAILURE_TAG_LABELS[tag]),
        issues: report.issues.map((issue) => issue.description),
      });
      setGrokText(result.analysis);
      showToast("Grok 已开口");
    } catch (error) {
      console.error("grok analyze failed", error);
      setGrokText("Grok 这会儿没出声，但这稿子的味已经闻出来了。先从删空话开始。");
      showToast("Grok 暂时没回话");
    } finally {
      setGrokLoading(false);
    }
  };

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
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, md: 3 }, py: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "180px 1fr auto" }, alignItems: "center", gap: 2, mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box component="img" src={logoMark} alt="稿子有毒" sx={{ width: 34, height: 34 }} />
            <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 18, letterSpacing: "0.04em" }}>稿子有毒</Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ color: poisonPalette.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}>
              案件簿
            </Typography>
            <Box sx={{ width: 82, mx: "auto", mt: 0.5, borderBottom: `2px solid ${poisonPalette.accent}` }} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" }, gap: 1, flexWrap: "nowrap" }}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate("/history")}
              sx={{
                borderColor: poisonPalette.line,
                color: poisonPalette.text,
                borderRadius: "4px",
                borderWidth: 2,
                minWidth: 112,
                whiteSpace: "nowrap",
                "&:hover": { borderColor: poisonPalette.accent, borderWidth: 2, bgcolor: "rgba(255,111,0,0.08)" },
              }}
            >
              历史
            </Button>
            <Button
              variant="contained"
              onClick={clearAll}
              sx={{
                bgcolor: poisonPalette.accent,
                color: "#111",
                borderRadius: "4px",
                fontWeight: 900,
                minWidth: 128,
                whiteSpace: "nowrap",
                px: 3,
                "&:hover": { bgcolor: poisonPalette.accent },
              }}
            >
              新建案件
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 280px" }, gap: 2 }}>
          <Box sx={{ pr: { lg: 1 } }}>
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ color: poisonPalette.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", mb: 1.25 }}>
                V_0.2 // 臭味取证引擎
              </Typography>
              <Typography sx={{ fontSize: { xs: 38, md: 72 }, lineHeight: 0.95, fontWeight: 900, letterSpacing: "-0.04em" }}>
                别再教我写爆款了，<br />
                把稿子给我，告诉你<Box component="span" sx={{ color: poisonPalette.accent }}>💩味</Box>在哪。
              </Typography>
              <Typography sx={{ color: poisonPalette.muted, fontSize: 14, mt: 1.5 }}>
                一级页是录入台，二级页做深度💩检。把文章/链接贴进来，帮你看看，你这篇的💩味在哪，又该如何去味儿。
              </Typography>
            </Box>

            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {CATEGORY_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    onClick={() => setCategory(option.value)}
                    sx={{
                      bgcolor: category === option.value ? poisonPalette.accent : "transparent",
                      color: category === option.value ? "#111" : poisonPalette.acid,
                      border: `1px solid ${poisonPalette.muted}`,
                      borderRadius: "999px",
                      fontWeight: 800,
                    }}
                  />
                ))}
                <Chip
                  label={`物证 ${files.length}`}
                  sx={{ bgcolor: "transparent", color: poisonPalette.muted, border: `1px solid ${poisonPalette.line}`, borderRadius: "999px", fontWeight: 700 }}
                />
              </Stack>

              <Box>
                <Typography sx={{ color: poisonPalette.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", mb: 0.75 }}>
                  正文原件
                </Typography>
                <TextField
                  fullWidth
                  value={content}
                  multiline
                  minRows={9}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="把可疑正文贴进来……"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "0px",
                      color: poisonPalette.text,
                      bgcolor: "rgba(255,255,255,0.02)",
                      fontFamily: "Inter, monospace",
                      "& fieldset": { borderColor: poisonPalette.muted, borderWidth: "2px" },
                      "&:hover fieldset": { borderColor: poisonPalette.acid },
                      "&.Mui-focused fieldset": { borderColor: poisonPalette.accent },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ color: poisonPalette.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", mb: 0.75 }}>
                  标题
                </Typography>
                <TextField
                  fullWidth
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="把标题也一并交上来"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "0px",
                      color: poisonPalette.text,
                      bgcolor: "rgba(255,255,255,0.02)",
                      "& fieldset": { borderColor: poisonPalette.muted, borderWidth: "2px" },
                      "&:hover fieldset": { borderColor: poisonPalette.acid },
                      "&.Mui-focused fieldset": { borderColor: poisonPalette.accent },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ color: poisonPalette.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", mb: 0.75 }}>
                  来源链接（可选）
                </Typography>
                <TextField
                  fullWidth
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://..."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "0px",
                      color: "#A7AEC2",
                      bgcolor: "rgba(255,255,255,0.02)",
                      "& fieldset": { borderColor: poisonPalette.muted, borderWidth: "2px" },
                      "&:hover fieldset": { borderColor: poisonPalette.acid },
                      "&.Mui-focused fieldset": { borderColor: poisonPalette.accent },
                    },
                  }}
                />
              </Box>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) => {
                    setFiles(Array.from(event.target.files ?? []));
                    showToast("物证已装袋");
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={() => inputRef.current?.click()}
                  sx={{
                    borderColor: poisonPalette.muted,
                    color: poisonPalette.text,
                    borderRadius: "0px",
                    borderWidth: 2,
                    "&:hover": { borderColor: poisonPalette.accent, borderWidth: 2, bgcolor: "rgba(255,111,0,0.08)" },
                  }}
                >
                  添加物证
                </Button>
                <Button
                  variant="contained"
                  onClick={loadExample}
                  sx={{
                    bgcolor: poisonPalette.accent,
                    color: "#111",
                    borderRadius: "0px",
                    fontWeight: 900,
                    px: 3,
                    "&:hover": { bgcolor: poisonPalette.accent },
                  }}
                >
                  加载示例屎文
                </Button>
                <Button
                  variant="text"
                  onClick={openLab}
                  sx={{ color: poisonPalette.acid, borderRadius: "0px" }}
                >
                  深入尸检
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ borderLeft: { lg: `1px solid ${poisonPalette.line}` }, pl: { lg: 2 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ border: `1px solid ${poisonPalette.line}`, bgcolor: poisonPalette.panel }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${poisonPalette.line}` }}>
                <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14 }}>处理动作</Typography>
                <Typography sx={{ color: poisonPalette.muted, fontSize: 11, mt: 0.5, letterSpacing: "0.12em" }}>当前案件可执行动作</Typography>
              </Box>
              {[
                { icon: <DeleteIcon fontSize="small" />, label: "清空案件", action: clearAll },
                { icon: <AddIcon fontSize="small" />, label: "添加物证", action: () => inputRef.current?.click() },
                { icon: <AutoFixHighIcon fontSize="small" />, label: "打开毒舌窗", action: openGrokWindow },
                { icon: <SaveAltIcon fontSize="small" />, label: "导出结果", action: exportSnapshot },
              ].map((action, index) => (
                <Box
                  key={action.label}
                  onClick={action.action}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 2,
                    py: 1.6,
                    bgcolor: index === 0 ? poisonPalette.accent : "transparent",
                    color: index === 0 ? "#111" : poisonPalette.text,
                    borderTop: index === 0 ? "none" : `1px solid ${poisonPalette.line}`,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  {action.icon}
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{action.label}</Typography>
                </Box>
              ))}
            </Box>

              <Box sx={{ border: `1px solid ${poisonPalette.line}`, bgcolor: poisonPalette.panel, p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
                  <Box component="img" src={logoMark} alt="稿子有毒图标" sx={{ width: 28, height: 28 }} />
                  <Typography sx={{ color: poisonPalette.text, fontWeight: 900 }}>烂文指数</Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 1 }}>
                  <Typography sx={{ fontSize: 62, lineHeight: 1, fontWeight: 900, color: scoreColor(report.trashIndex) }}>
                    {report.trashIndex}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: poisonPalette.muted, mb: 0.75 }}>
                    {scoreDescriptor(report.trashIndex)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    mt: 1.25,
                    p: 1,
                    border: `1px dashed ${poisonPalette.line}`,
                    bgcolor: "rgba(255,255,255,0.02)",
                    transform: "rotate(-1deg)",
                  }}
                >
                  <Stack direction="row" spacing={0.45}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Typography key={index} sx={{ fontSize: 20, opacity: index < poopCount ? 1 : 0.18, transform: index % 2 ? "translateY(-2px)" : "translateY(2px)" }}>
                        💩
                      </Typography>
                    ))}
                  </Stack>
                </Box>
                <Typography sx={{ color: poisonPalette.muted, fontSize: 12, mt: 1.25 }}>
                  {report.grade === "Hopeless" ? "没救了，建议整篇翻修" : report.grade === "Serious" ? "味道不小，建议马上去味" : "开始返味，但还有救"}
                </Typography>
              </Box>

            <Box sx={{ border: `1px solid ${poisonPalette.line}`, bgcolor: poisonPalette.panel, p: 2 }}>
              <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14, mb: 1 }}>臭味标签</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
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
                      borderRadius: "999px",
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

            <Box ref={grokRef} sx={{ border: `1px solid ${poisonPalette.line}`, bgcolor: poisonPalette.panel, p: 2 }}>
              <Typography sx={{ color: poisonPalette.accent, fontWeight: 900, fontSize: 14, mb: 1 }}>毒舌窗口</Typography>
              <Typography sx={{ color: poisonPalette.text, fontSize: 14, lineHeight: 1.7 }}>
                这里现在会直接显示 Grok 的吐槽，不是摆设。
              </Typography>
              <Box sx={{ mt: 1.5, p: 1.25, border: `1px dashed #5C5C5C`, color: poisonPalette.muted, fontSize: 12, lineHeight: 1.8, minHeight: 112 }}>
                {grokLoading ? "Grok 正在组织语言，准备补刀……" : grokText}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
