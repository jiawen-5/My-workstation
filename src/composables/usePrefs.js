import { reactive, watch } from "vue";
import { nowHM } from "./useDay.js";
import { todayKey } from "../api/database.js";

/*
 * 界面偏好：深浅色、右侧时间轴是否折叠、今日起床/休息时间。
 * 这些是轻量状态且不涉及数据完整性，放在 localStorage；
 * 任务与时间轴数据仍然走 SQLite（见 api/database.js）。
 * 起床/休息按自然日存，跨天后自动回到空白（未起床 / 未结束）。
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

export function wakeNow() {
  prefs.day = { date: todayKey(), wake: nowHM(), rest: "" };
}

export function restNow() {
  if (!prefs.day.wake) return;
  prefs.day.date = todayKey();
  prefs.day.rest = nowHM();
}
