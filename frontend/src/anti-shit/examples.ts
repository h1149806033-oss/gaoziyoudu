import type { DetectorCategory } from "./types";

export const CATEGORY_OPTIONS: Array<{ value: DetectorCategory; label: string }> = [
  { value: "home", label: "家居" },
  { value: "lifestyle", label: "生活" },
];

export const EXAMPLE_DRAFTS: Record<DetectorCategory, { title: string; content: string }> = {
  home: {
    title: "小家这样布置真的太有氛围感了！！普通人直接抄作业",
    content:
      "最近终于把我的小家慢慢布置成自己喜欢的样子了，真的太有氛围感了。\n\n" +
      "很多人问我为什么看起来这么舒服，其实就是一些感觉上的变化，幸福感真的会提升很多。\n\n" +
      "如果你也想拥有这种高级感和松弛感，照着做就可以了，闭眼入真的不会出错。",
  },
  lifestyle: {
    title: "独居后我终于悟了，普通女生一定要学会这种生活方式！",
    content:
      "自从开始一个人生活，我真的越来越喜欢这种状态了。\n\n" +
      "以前总觉得生活很乱，但现在慢慢学会了一些方法之后，整个人都被狠狠治愈。\n\n" +
      "其实也没有什么复杂的方法，最重要的是找到自己的节奏，谁懂这种幸福感啊。",
  },
};
