import { ref } from "vue";
import { PRI_COLOR } from "../constants/nav.js";
import { nowHM, dur } from "../composables/useDay.js";
import { sqlite, todayKey } from "../api/database.js";

/*
 * 唯一数据源：内存 ref + SQLite/localStorage 持久化。
 * - 默认空数据：不含任何演示/种子内容，界面上的任务完全由用户自己录入。
 * - App 启动时调用 `load()` 一次；Tauri 内读 SQLite，浏览器 dev 读 localStorage，
 *   恢复成上次关闭时的样子。
 * - 之后所有变更先改内存（UI 立刻响应），再异步落盘，失败不阻塞交互。
 */

let nid = 1000;
const nextLocalId = () => ++nid;

const tasks = ref([]);
const timeline = ref([]);
const loaded = ref(false);

function snapshot() {
  return {
    tasks: tasks.value.map((t) => ({ ...t, subs: t.subs.map((s) => ({ ...s })) })),
    timeline: timeline.value.map((e) => ({ ...e })),
  };
}

function persistFallback() {
  // Tauri 内也写一份 localStorage 镜像：SQL 失败时刷新仍有兜底，不丢数据
  sqlite.writeLS(snapshot());
}

/* ---- 时间轴同步（内存 + 落盘） ---- */
function pushTimeline(e) {
  const entry = { id: nextLocalId(), bizDate: todayKey(), ...e };
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
    saveEntry(ex);
  } else if (t.startAt) {
    pushTimeline({ title: t.title, range, dur: dur(t.startAt, t.endAt), color: t.color, tag: "待办 · 已同步", active: !t.endAt, taskId: t.id });
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
      pushTimeline({ title: `${t.title} · ${s.text}`, range, dur: dur(s.startAt, s.endAt), color: t.color, tag: "子任务 · 已同步", taskId: t.id, subId: s.id });
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

export function useWorkbench() {
  const load = async () => {
    if (loaded.value) return;
    loaded.value = true;
    // 浏览器 dev：localStorage 有就恢复
    if (!sqlite.isTauri()) {
      const cached = sqlite.readLS();
      if (cached) {
        tasks.value = cached.tasks || [];
        timeline.value = cached.timeline || [];
      }
      return;
    }
    // Tauri：读 SQLite，失败则用 localStorage 镜像兜底
    const bizDate = todayKey();
    const data = await sqlite.loadDay(bizDate).catch(() => null);
    if (!data) {
      const cached = sqlite.readLS();
      if (cached) {
        tasks.value = cached.tasks || [];
        timeline.value = cached.timeline || [];
      }
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
    timeline.value = data.entries.map(sqlite.rowToEntry);
  };

  const createTask = async ({ title, priority, deadline, tags, mode }) => {
    const t = {
      id: nextLocalId(), title: title.trim(), priority, deadline, tags: [...tags],
      color: PRI_COLOR[priority], mode, status: "todo",
      startAt: "", endAt: "", newSub: "", editing: false, subs: [],
    };
    tasks.value.unshift(t);
    persistFallback();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertTask({ ...t, tags: JSON.stringify(t.tags) }).catch(() => null);
      if (id) t.id = id;
    }
  };

  const startTask = (t) => {
    if (!t.startAt) t.startAt = nowHM();
    t.status = "doing";
    persistTask(t);
    syncTaskBlock(t);
  };
  const endSimple = (t) => {
    if (!t.startAt) t.startAt = nowHM();
    t.endAt = nowHM();
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
  const toggleSub = (t, s) => {
    s.done = !s.done;
    if (s.done) {
      if (!s.startAt) s.startAt = t.startAt || nowHM();
      s.endAt = nowHM();
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
  const saveTimelineEntry = async (draft, editing) => {
    if (editing) {
      editing.title = draft.title;
      editing.range = draft.range;
      editing.dur = draft.dur || "";
      // 补上结束时间就不再是「进行中」
      if (draft.end) editing.active = false;
      editing.manual = true;
      saveEntry(editing);
    } else {
      pushTimeline({ title: draft.title, range: draft.range, dur: draft.dur || "", color: "#b9b08a", manual: true });
    }
  };
  const delTimelineEntry = (e) => {
    timeline.value = timeline.value.filter((x) => x !== e);
    persistFallback();
    if (sqlite.isTauri()) sqlite.deleteEntry(e.id);
  };

  return { tasks, timeline, loaded, load, createTask, startTask, endSimple, reopenSimple, toggleSub, addSub, delSub, delTask, switchMode, toggleEdit, saveTimelineEntry, delTimelineEntry };
}
