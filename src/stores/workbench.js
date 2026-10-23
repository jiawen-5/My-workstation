import { computed, ref } from "vue";
import { PRI_COLOR } from "../constants/nav.js";
import { bjDateKey, bjNowHM, dur, keyLabel } from "../composables/useDay.js";
import { prefs } from "../composables/usePrefs.js";
import { sqlite } from "../api/database.js";

/*
 * 唯一数据源：内存 ref + SQLite/localStorage 持久化。
 * - 默认空数据：不含任何演示/种子内容，界面上的任务完全由用户自己录入。
 * - 任务自带 bizDate（归属日期），总览月历按它把任务铺到每一天的格子里，
 *   所以加载时一次读全量，切年月只是内存筛选，不打 IO。
 * - 「选中的日期」默认是北京时间今天；用户手动点过日期后才锁定，
 *   未手动选择时新建任务一律落到北京时间当天。
 */

let nid = 1000;
const nextLocalId = () => ++nid;

const tasks = ref([]);
const timeline = ref([]);
/* 每天的起床/休息时间：{ 'YYYY-MM-DD': { wake, rest } }，支持按日补录 */
const marks = ref({});
const loaded = ref(false);

const today = ref(bjDateKey());
const selectedDate = ref(today.value);
/* 用户是否手动选过日期；一旦选过就不再跟着北京时间漂移 */
let pickedDate = false;

let ticker = null;
function ensureTicker() {
  if (ticker) return;
  // 桌面端常年不关，跨过午夜后要自己把「今天」和默认选中日推一天
  ticker = setInterval(() => {
    const k = bjDateKey();
    if (k === today.value) return;
    today.value = k;
    if (!pickedDate) selectedDate.value = k;
  }, 30000);
}

const selectedLabel = computed(() => keyLabel(selectedDate.value));
const isToday = computed(() => selectedDate.value === today.value);

/* ---- 按日期索引 ---- */
const RANK = { doing: 0, todo: 1, done: 2 };

function cmpTask(a, b) {
  const r = (RANK[a.status] ?? 1) - (RANK[b.status] ?? 1);
  if (r) return r;
  if (a.startAt && b.startAt && a.startAt !== b.startAt) return a.startAt < b.startAt ? -1 : 1;
  if (a.startAt !== b.startAt) return a.startAt ? -1 : 1;
  return a.id - b.id;
}

const byDate = computed(() => {
  const map = new Map();
  for (const t of tasks.value) {
    const k = t.bizDate || "";
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  for (const list of map.values()) list.sort(cmpTask);
  return map;
});

const tasksOn = (key) => byDate.value.get(key) || [];
const entriesOn = (key) => timeline.value.filter((e) => (e.bizDate || "") === key);

function setDate(key) {
  selectedDate.value = key || bjDateKey();
  pickedDate = true;
}

function goToday() {
  setDate(bjDateKey());
}

/* ---- 起床 / 休息打卡 ---- */

/*
 * 某一天的起床、休息时间。优先取库里的记录；今天还没有记录时退回 prefs
 * 里的「今日」缓存 —— 老版本只存在那里，升级后今天的打卡不会丢。
 */
function markOf(key) {
  const m = marks.value[key] || {};
  const fb = key === today.value && prefs.day.date === key ? prefs.day : {};
  return { wake: m.wake || fb.wake || "", rest: m.rest || fb.rest || "" };
}

/* 单字段写入：补录起床只写开始时间，补录休息只写结束时间，互不覆盖 */
function setMark(key, kind, hm) {
  const merged = { ...markOf(key), [kind]: hm || "" };
  marks.value = { ...marks.value, [key]: merged };
  // 顶部栏的按钮和右侧时间轴共用同一份数据，同时保留本地镜像
  if (key === today.value) prefs.day = { date: key, wake: merged.wake, rest: merged.rest };
  persistFallback();
  if (sqlite.isTauri()) sqlite.upsertMark(key, merged.wake, merged.rest).catch(() => {});
  return merged;
}

/* 顶部栏的「起床 / 休息」：按当前北京时间打点，休息需要先有起床记录 */
function markNow(kind) {
  const key = today.value;
  if (kind === "rest") {
    if (!markOf(key).wake) return;
    setMark(key, "rest", bjNowHM());
    return;
  }
  setMark(key, "wake", bjNowHM());
  // 起床代表新的一天开始，之前残留的休息时间作废
  if (markOf(key).rest) setMark(key, "rest", "");
}

function snapshot() {
  return {
    tasks: tasks.value.map((t) => ({ ...t, subs: t.subs.map((s) => ({ ...s })) })),
    timeline: timeline.value.map((e) => ({ ...e })),
    marks: { ...marks.value },
  };
}

function persistFallback() {
  // Tauri 内也写一份 localStorage 镜像：SQL 失败时刷新仍有兜底，不丢数据
  sqlite.writeLS(snapshot());
}

/* ---- 时间轴同步（内存 + 落盘） ---- */
function pushTimeline(e) {
  const entry = { id: nextLocalId(), ...e };
  // 任务被同步成时间轴区块时带自己的归属日；手动补录则落在当前选中日
  if (!entry.bizDate) entry.bizDate = selectedDate.value;
  timeline.value.push(entry);
  persistFallback();
  if (sqlite.isTauri()) sqlite.insertEntry(entry).then((id) => { if (id) entry.id = id; }).catch(() => {});
  return entry;
}

function saveEntry(entry) {
  persistFallback();
  if (sqlite.isTauri()) sqlite.updateEntry(entry);
}

function syncTaskBlock(t) {
  const ex = timeline.value.find((e) => e.taskId === t.id && !e.subId);
  const range = t.endAt ? `${t.startAt} — ${t.endAt}` : `${t.startAt} — 进行中`;
  if (ex) {
    ex.range = range;
    ex.dur = dur(t.startAt, t.endAt);
    ex.active = !t.endAt;
    ex.title = t.title;
    ex.bizDate = t.bizDate || ex.bizDate;
    saveEntry(ex);
  } else if (t.startAt) {
    pushTimeline({ title: t.title, range, dur: dur(t.startAt, t.endAt), color: t.color, tag: "待办 · 已同步", active: !t.endAt, taskId: t.id, bizDate: t.bizDate });
  }
}

function syncSubBlock(t, s) {
  const ex = timeline.value.find((e) => e.subId === s.id);
  if (s.done && s.startAt && s.endAt) {
    const range = `${s.startAt} — ${s.endAt}`;
    if (ex) {
      ex.range = range;
      ex.dur = dur(s.startAt, s.endAt);
      saveEntry(ex);
    } else {
      pushTimeline({ title: `${t.title} · ${s.text}`, range, dur: dur(s.startAt, s.endAt), color: t.color, tag: "子任务 · 已同步", taskId: t.id, subId: s.id, bizDate: t.bizDate });
    }
  } else if (ex && !s.done) {
    timeline.value = timeline.value.filter((e) => e !== ex);
    persistFallback();
    if (sqlite.isTauri()) sqlite.deleteEntry(ex.id);
  }
}

function persistTask(t) {
  persistFallback();
  if (sqlite.isTauri()) {
    sqlite.updateTask({ ...t, tags: JSON.stringify(t.tags) });
  }
}

function restoreFallback() {
  const cached = sqlite.readLS();
  if (!cached) return false;
  tasks.value = (cached.tasks || []).map((t) => ({
    ...t,
    bizDate: t.bizDate || t.biz_date || today.value,
    newSub: "",
    editing: false,
    subs: t.subs || [],
  }));
  timeline.value = (cached.timeline || []).map((e) => ({ ...e, bizDate: e.bizDate || today.value }));
  marks.value = cached.marks || {};
  return true;
}

export function useWorkbench() {
  const load = async () => {
    if (loaded.value) return;
    loaded.value = true;
    ensureTicker();
    // 浏览器 dev：localStorage 有就恢复
    if (!sqlite.isTauri()) {
      restoreFallback();
      return;
    }
    // Tauri：读 SQLite，失败则用 localStorage 镜像兜底
    const data = await sqlite.loadAll().catch(() => null);
    if (!data) {
      restoreFallback();
      return;
    }
    // 库里是空的就保持空列表：不写任何默认数据
    const subByTask = new Map();
    for (const r of data.subs) {
      const sub = sqlite.rowToSub(r);
      if (!subByTask.has(sub.taskId)) subByTask.set(sub.taskId, []);
      subByTask.get(sub.taskId).push({ id: sub.id, text: sub.text, done: sub.done, startAt: sub.startAt, endAt: sub.endAt, note: sub.note });
    }
    tasks.value = data.tasks.map((r) => ({
      id: r.id,
      bizDate: r.biz_date || today.value,
      title: r.title,
      priority: r.priority,
      deadline: r.deadline || "",
      tags: JSON.parse(r.tags || "[]"),
      color: r.color,
      mode: r.mode,
      status: r.status,
      startAt: r.start_at || "",
      endAt: r.end_at || "",
      newSub: "",
      editing: false,
      subs: subByTask.get(r.id) || [],
    }));
    timeline.value = data.entries.map(sqlite.rowToEntry).map((e) => ({ ...e, bizDate: e.bizDate || today.value }));
    marks.value = Object.fromEntries(
      (data.marks || []).map((r) => [r.biz_date, { wake: r.wake || "", rest: r.rest || "" }]),
    );
    // 老数据没有归属日期：就地补成今天，免得它们从月历上凭空消失
    const stale =
      data.tasks.some((r) => !r.biz_date) || data.entries.some((r) => !r.biz_date);
    if (stale) sqlite.backfillDates(today.value).catch(() => {});
  };

  const createTask = async ({ title, priority, deadline, tags, mode }) => {
    const bizDate = selectedDate.value;
    const t = {
      id: nextLocalId(), bizDate, title: title.trim(), priority, deadline, tags: [...tags],
      color: PRI_COLOR[priority], mode, status: "todo",
      startAt: "", endAt: "", newSub: "", editing: false, subs: [],
    };
    tasks.value.unshift(t);
    persistFallback();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertTask({ ...t, tags: JSON.stringify(t.tags) }).catch(() => null);
      if (id) t.id = id;
    }
    return t;
  };

  const startTask = (t) => {
    if (!t.startAt) t.startAt = bjNowHM();
    t.status = "doing";
    persistTask(t);
    syncTaskBlock(t);
  };
  const endSimple = (t) => {
    if (!t.startAt) t.startAt = bjNowHM();
    t.endAt = bjNowHM();
    t.status = "done";
    persistTask(t);
    syncTaskBlock(t);
  };
  const reopenSimple = (t) => {
    t.status = "doing";
    t.endAt = "";
    persistTask(t);
    syncTaskBlock(t);
  };
  /* 可拆分任务点「进行中」就是结束：和简单任务同一套收尾逻辑，子任务保持原样 */
  const endTask = endSimple;
  const reopenTask = reopenSimple;
  const toggleSub = (t, s) => {
    s.done = !s.done;
    if (s.done) {
      if (!s.startAt) s.startAt = t.startAt || bjNowHM();
      s.endAt = bjNowHM();
    } else {
      s.endAt = "";
    }
    persistFallback();
    if (sqlite.isTauri()) sqlite.updateSub({ ...s, taskId: t.id });
    syncSubBlock(t, s);
  };
  const addSub = async (t) => {
    const v = (t.newSub || "").trim();
    if (!v) return;
    const s = { id: nextLocalId(), text: v, done: false, startAt: "", endAt: "" };
    t.subs.push(s);
    t.newSub = "";
    persistFallback();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertSub(t.id, s).catch(() => null);
      if (id) s.id = id;
    }
  };
  const delSub = (t, s) => {
    t.subs = t.subs.filter((x) => x !== s);
    timeline.value = timeline.value.filter((e) => e.subId !== s.id);
    persistFallback();
    if (sqlite.isTauri()) sqlite.deleteSub(s.id);
  };
  const delTask = (t) => {
    tasks.value = tasks.value.filter((x) => x !== t);
    timeline.value = timeline.value.filter((e) => e.taskId !== t.id);
    persistFallback();
    if (sqlite.isTauri()) sqlite.deleteTask(t.id);
  };
  const switchMode = (t, m) => {
    t.mode = m;
    if (m === "simple") {
      for (const s of t.subs) if (sqlite.isTauri()) sqlite.deleteSub(s.id);
      t.subs = [];
    }
    persistTask(t);
  };
  const toggleEdit = (t) => {
    t.editing = !t.editing;
    // 名字改完收笔时才落盘，并让时间轴上对应的区块同步改名
    if (!t.editing) {
      persistTask(t);
      syncTaskBlock(t);
    }
  };
  const saveTimelineEntry = async (draft, editing, bizDate) => {
    if (editing) {
      editing.title = draft.title;
      editing.range = draft.range;
      editing.dur = draft.dur || "";
      // 补上结束时间就不再是「进行中」
      if (draft.end) editing.active = false;
      editing.manual = true;
      saveEntry(editing);
    } else {
      pushTimeline({ title: draft.title, range: draft.range, dur: draft.dur || "", color: "#b9b08a", manual: true, bizDate: bizDate || selectedDate.value });
    }
  };
  const delTimelineEntry = (e) => {
    timeline.value = timeline.value.filter((x) => x !== e);
    persistFallback();
    if (sqlite.isTauri()) sqlite.deleteEntry(e.id);
  };

  return {
    tasks, timeline, marks, loaded,
    today, selectedDate, selectedLabel, isToday,
    tasksOn, entriesOn, markOf, setMark, markNow,
    setDate, goToday,
    load, createTask, startTask, endTask, reopenTask, endSimple, reopenSimple,
    toggleSub, addSub, delSub, delTask,
    switchMode, toggleEdit, saveTimelineEntry, delTimelineEntry,
  };
}
