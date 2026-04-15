import ReactECharts from "echarts-for-react";

interface Props {
  data: Record<string, number>;
}

const DIMENSION_LABELS: Record<string, string> = {
  content: "内容质量",
  visual: "视觉表现",
  growth: "增长策略",
  user_reaction: "用户反应",
  overall: "综合评分",
};

export default function RadarChart({ data }: Props) {
  const keys = Object.keys(DIMENSION_LABELS);
  const indicators = keys.map((key) => ({
    name: DIMENSION_LABELS[key],
    max: 100,
  }));
  const values = keys.map((key) => data[key] ?? 50);

  const option = {
    animationDuration: 1200,
    radar: {
      indicator: indicators,
      shape: "polygon" as const,
      splitNumber: 4,
      radius: "65%",
      axisName: { color: "#262626", fontSize: 12, fontWeight: 600 },
      splitLine: { lineStyle: { color: "#f0f0f0" } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: "#e8e8e8" } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            areaStyle: { color: "rgba(255,36,66,0.15)" },
            lineStyle: { color: "#ff2442", width: 2 },
            itemStyle: { color: "#ff2442", borderColor: "#fff", borderWidth: 2 },
            symbol: "circle",
            symbolSize: 6,
          },
        ],
      },
    ],
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "#f0f0f0",
      textStyle: { color: "#262626", fontSize: 13 },
    },
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
