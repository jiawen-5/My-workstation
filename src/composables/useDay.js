import { computed } from "vue";

export function nowHM() {
  return new Date().toTimeString().slice(0, 5);
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
  return computed(() => {
    const d = new Date();
    const week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${week}`;
  });
}
