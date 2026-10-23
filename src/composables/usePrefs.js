import { reactive, watch } from "vue";
import { todayKey } from "../api/database.js";

/*
 * 界面偏好：深浅色、右侧时间轴是否折叠。
 * 这些是轻量状态且不涉及数据完整性，放在 localStorage；
 * 任务、时间轴、起床/休息打卡仍然走 SQLite（见 api/database.js、stores/workbench.js）。
 *
 * day 只是「今天起床/休息」的本地镜像：
 * - 老版本把打卡只存在这里，读取时用它兜底，升级后当天记录不丢；
 * - 新版由 store 写入（同时落 SQLite），顶部栏和时间轴读的是同一份。
 */

const KEY = "workbench.prefs.v1";

const freshDay = () => ({ date: todayKey(), wake: "", rest: "" });

function read() {
  const prefs = { dark: false, collapsed: false, day: freshDay() };
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    raw = null;
  }
  if (raw && typeof raw === "object") {
    prefs.dark = !!raw.dark;
    prefs.collapsed = !!raw.collapsed;
    // 只认当天的记录，昨天的不带入今天
    if (raw.day?.date === todayKey()) {
      prefs.day = { date: raw.day.date, wake: raw.day.wake || "", rest: raw.day.rest || "" };
    }
  }
  return prefs;
}

export const prefs = reactive(read());

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ dark: prefs.dark, collapsed: prefs.collapsed, day: prefs.day }));
  } catch {
    /* 忽略配额错误 */
  }
}

watch(prefs, persist, { deep: true });
