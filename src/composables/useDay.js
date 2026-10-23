import { computed } from "vue";

/*
 * 时间基准：整个工作台的「今天/现在」都按北京时间（UTC+8）算，
 * 而不是机器本地时区。这样换电脑、改系统时区，任务归属日和日期行都还是同一个。
 */
const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
const pad2 = (n) => String(n).padStart(2, "0");

/* 把任意时刻换算成「北京时间的墙上时间」，再用本地读取器读年月日时分 */
function bjWallClock(d = new Date()) {
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + BJ_OFFSET_MS);
}

export function bjNowHM(d = new Date()) {
  const b = bjWallClock(d);
  return `${pad2(b.getHours())}:${pad2(b.getMinutes())}`;
}

export function dur(a, b) {
  if (!a || !b) return "";
  const m = (h) => {
    const [x, y] = h.split(":").map(Number);
    return x * 60 + y;
  };
  const d = m(b) - m(a);
  if (d <= 0) return "";
  return d >= 60 ? `${Math.floor(d / 60)}小时${d % 60 ? d % 60 + "分" : ""}` : `${d}分钟`;
}

/* ---------- 日期键（YYYY-MM-DD）工具 ---------- */

export function bjDateKey(d = new Date()) {
  const b = bjWallClock(d);
  return `${b.getFullYear()}-${pad2(b.getMonth() + 1)}-${pad2(b.getDate())}`;
}

/* 键一律按本地 Date 构造/格式化：只用来做日历算术，不参与「现在几点」的判断 */
export function dateToKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function keyToDate(key) {
  const [y, m, d] = String(key || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateToKey(d);
}

const CN_WEEK = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/* 2026年10月24日 · 星期六 */
export function keyLabel(key) {
  const d = keyToDate(key);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${CN_WEEK[d.getDay()]}`;
}

/* 10月24日 */
export function keyShortLabel(key) {
  const d = keyToDate(key);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/* 相对今天的自然语言：今天 / 昨天 / 明天 / 3 天后 / 5 天前 */
export function relativeLabel(key, todayKey = bjDateKey()) {
  const diff = Math.round((keyToDate(key) - keyToDate(todayKey)) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  return diff > 0 ? `${diff} 天后` : `${-diff} 天前`;
}

/*
 * 时间轴区块的起止时间存在 range 文本里，形如「14:00 — 15:30」或「08:00 — 进行中」。
 * 编辑时拆回两个时间，拆不出来的部分（比如「进行中」）当空值处理。
 */
const HMS = /^\d{1,2}:\d{2}$/;

export function parseRange(range) {
  const [a = "", b = ""] = String(range || "").split(/\s*[—–-]\s*/);
  return {
    start: HMS.test(a.trim()) ? a.trim() : "",
    end: HMS.test(b.trim()) ? b.trim() : "",
  };
}

export function useDateLine() {
  return computed(() => keyLabel(bjDateKey()));
}
