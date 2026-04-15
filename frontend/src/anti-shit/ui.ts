export const poisonPalette = {
  bg: "#0E0E0E",
  panel: "#121212",
  line: "#2A2A2A",
  text: "#F6F1E8",
  muted: "#8D8A80",
  accent: "#FF6F00",
  accentSoft: "#FF9A3C",
  acid: "#F6FF65",
  tagBg: "#232323",
};

export function poopLevel(score: number) {
  return Math.max(1, Math.min(5, Math.ceil(score / 20)));
}

export function scoreColor(score: number) {
  if (score >= 75) return poisonPalette.accent;
  if (score >= 55) return poisonPalette.accentSoft;
  return poisonPalette.acid;
}
