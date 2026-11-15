/*
 * 长期计划（读书 / 减肥）的静态配置与计算口径。
 *
 * 热量都走两套通用估算公式，够日常记录用：
 *   饮食：kcal = 每 100g 热量 × 克数 ÷ 100（FOODS 里的数值是常见均值）
 *   运动：kcal = MET × 体重(kg) × 小时数
 * 结果是估算值，界面上都用「≈」标明，别当医疗器械的精度要求。
 */

export const PLAN_KINDS = ["reading", "diet"];

export const PLAN_META = {
  reading: { title: "读书计划", icon: "读书", accent: "#a8c5b8", desc: "书单 · 时长 · 趋势" },
  diet: { title: "减肥计划", icon: "减肥", accent: "#d4a5a5", desc: "饮食 · 饮水 · 运动" },
};

/* 周期可选的档位（也可以自己填天数） */
export const CYCLE_OPTIONS = [30, 60, 90];

/* 各计划的默认目标：老用户第一次打开时按这个起步，之后以库里为准 */
export const DEFAULT_TARGETS = {
  reading: { dailyMinutes: 30 },
  diet: { startWeight: 65, targetWeight: 58, waterGoal: 2000, intakeGoal: 1600 },
};

/* 常见食物：每 100g 热量 + 常用份量（克）。选中后克数自动填好，不用每次称 */
export const FOODS = [
  { name: "米饭", kcal: 116, portion: 150 },
  { name: "杂粮饭", kcal: 110, portion: 150 },
  { name: "面条（煮）", kcal: 110, portion: 200 },
  { name: "馒头", kcal: 223, portion: 100 },
  { name: "全麦面包", kcal: 246, portion: 60 },
  { name: "燕麦片（干）", kcal: 377, portion: 40 },
  { name: "鸡蛋", kcal: 144, portion: 50 },
  { name: "鸡胸肉", kcal: 133, portion: 120 },
  { name: "鸡腿（去皮）", kcal: 146, portion: 100 },
  { name: "牛肉（瘦）", kcal: 106, portion: 100 },
  { name: "猪里脊", kcal: 155, portion: 100 },
  { name: "三文鱼", kcal: 139, portion: 100 },
  { name: "虾仁", kcal: 93, portion: 100 },
  { name: "豆腐", kcal: 82, portion: 100 },
  { name: "牛奶（全脂）", kcal: 54, portion: 250 },
  { name: "无糖酸奶", kcal: 72, portion: 150 },
  { name: "豆浆（无糖）", kcal: 31, portion: 250 },
  { name: "西兰花", kcal: 34, portion: 150 },
  { name: "生菜", kcal: 15, portion: 100 },
  { name: "番茄", kcal: 20, portion: 150 },
  { name: "黄瓜", kcal: 16, portion: 150 },
  { name: "土豆", kcal: 77, portion: 150 },
  { name: "玉米", kcal: 112, portion: 150 },
  { name: "红薯", kcal: 90, portion: 150 },
  { name: "苹果", kcal: 53, portion: 200 },
  { name: "香蕉", kcal: 93, portion: 120 },
  { name: "橙子", kcal: 48, portion: 200 },
  { name: "蓝莓", kcal: 57, portion: 100 },
  { name: "坚果（混合）", kcal: 600, portion: 25 },
  { name: "水饺", kcal: 240, portion: 200 },
  { name: "外卖盖饭", kcal: 180, portion: 450 },
  { name: "炸鸡", kcal: 279, portion: 150 },
  { name: "奶茶（全糖）", kcal: 90, portion: 500 },
  { name: "可乐", kcal: 43, portion: 330 },
  { name: "薯片", kcal: 536, portion: 50 },
  { name: "巧克力", kcal: 546, portion: 30 },
];

/* 运动：MET 值（代谢当量），消耗按体重折算 */
export const EXERCISES = [
  { name: "快走（5km/h）", met: 3.5 },
  { name: "慢跑（7km/h）", met: 7 },
  { name: "跑步（9km/h）", met: 9 },
  { name: "骑车（休闲）", met: 5.8 },
  { name: "跳绳", met: 11 },
  { name: "游泳（自由泳）", met: 8.3 },
  { name: "力量训练", met: 5 },
  { name: "跳操 / HIIT", met: 6.5 },
  { name: "羽毛球", met: 5.5 },
  { name: "爬楼梯", met: 8.8 },
  { name: "瑜伽", met: 2.5 },
  { name: "拉伸", met: 2.3 },
  { name: "家务", met: 2.8 },
];

/* 自定义运动没有 MET 时的兜底值，取中等强度 */
export const DEFAULT_MET = 5;

export const WATER_STEPS = [200, 300, 500];

/* 上传 txt 的上限：再大就该拆分了，整本塞进 SQLite 会拖慢读写 */
export const MAX_TXT_BYTES = 5 * 1024 * 1024;

export const foodKcal = (per100, grams) =>
  Math.round(((Number(per100) || 0) * (Number(grams) || 0)) / 100);

export const burnKcal = (met, minutes, weightKg) =>
  Math.round(((Number(met) || 0) * (Number(weightKg) || 60) * (Number(minutes) || 0)) / 60);

/* 分钟转「1 小时 20 分」，各处时长展示统一口径 */
export function fmtMinutes(total) {
  const m = Math.max(0, Math.round(Number(total) || 0));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} 小时 ${rest} 分` : `${h} 小时`;
}

export const fmtKg = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toFixed(1)} kg`;
