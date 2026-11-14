import { reactive, watch } from "vue";
import { todayKey } from "../api/database.js";
import { NAV_GROUPS } from "../constants/nav.js";

/*
 * 界面偏好：深浅色、右侧时间轴是否折叠、当前停留的页面、展开的菜单组。
 * 这些是轻量状态且不涉及数据完整性，放在 localStorage；
 * 任务、时间轴、起床/休息打卡仍然走 SQLite（见 api/database.js、stores/workbench.js）。
 *
 * day 只是「今天起床/休息」的本地镜像：
 * - 老版本把打卡只存在这里，读取时用它兜底，升级后当天记录不丢；
 * - 新版由 store 写入（同时落 SQLite），顶部栏和时间轴读的是同一份。
 */

const KEY = "workbench.prefs.v1";
const HOME = "日常待办";
const DEFAULT_GROUPS = ["待办", "成长"];

/* 能停留的页面：侧栏里真正可点的项（理财这类二期板块排除掉） */
const PAGES = new Set(
  NAV_GROUPS.filter((g) => !g.future).flatMap((g) => (g.children.length ? g.children : [g.name])),
);

/* 秋招文章页存在数据库里，页面名形如 note:12，这里只校验格式对不对 */
const isPage = (p) => typeof p === "string" && (PAGES.has(p) || /^note:\d+$/.test(p));

const freshDay = () => ({ date: todayKey(), wake: "", rest: "" });

function read() {
  const prefs = { dark: false, collapsed: false, page: HOME, openGroups: [...DEFAULT_GROUPS], day: freshDay() };
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    raw = null;
  }
  if (raw && typeof raw === "object") {
    prefs.dark = !!raw.dark;
    prefs.collapsed = !!raw.collapsed;
    // 刷新后回到上次停留的页面；页面不存在了（比如板块改名）就回首页
    prefs.page = isPage(raw.page) ? raw.page : HOME;
    if (Array.isArray(raw.openGroups)) {
      prefs.openGroups = raw.openGroups.filter((n) => typeof n === "string");
    }
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
    localStorage.setItem(KEY, JSON.stringify({
      dark: prefs.dark,
      collapsed: prefs.collapsed,
      page: prefs.page,
      openGroups: [...prefs.openGroups],
      day: prefs.day,
    }));
  } catch {
    /* 忽略配额错误 */
  }
}

watch(prefs, persist, { deep: true });
