/* 积分规则：25 分钟折 1 积分，手动补录按四舍五入折算 */
export const POMODORO_MINUTES = 25;
export const MINUTES_PER_POINT = 25;

export const STAMP_KINDS = {
  study: { label: "学习计时", icon: "⏱", color: "#a8c5b8" },
  task: { label: "任务完成", icon: "✓", color: "#d4a5a5" },
  milestone: { label: "里程碑", icon: "★", color: "#b9b08a" },
  redeem: { label: "积分兑换", icon: "🎁", color: "#e8d4b8" },
};

/* 里程碑常用档位：点一下就能填进积分框，避免每次手打 */
export const MILESTONE_PRESETS = [20, 50, 100, 200];

/* 首次进入赠送的奖品，全部可删可改，删空了也不会自动回填 */
export const DEFAULT_PRIZES = [
  { name: "一杯奶茶", cost: 6, emoji: "🧋", note: "学累了奖励自己一杯" },
  { name: "看一部电影", cost: 15, emoji: "🎬", note: "心安理得追一部片" },
  { name: "买一本新书", cost: 30, emoji: "📚", note: "想读很久的那本" },
  { name: "睡到自然醒", cost: 12, emoji: "😴", note: "周末不打闹钟" },
  { name: "半日放空", cost: 20, emoji: "🌿", note: "什么都不做也行" },
  { name: "一顿大餐", cost: 40, emoji: "🍲", note: "好好吃一顿" },
  { name: "心仪小物", cost: 60, emoji: "🛍️", note: "购物车里躺很久的那件" },
  { name: "一日出游", cost: 120, emoji: "🚞", note: "去有风的地方待一天" },
];