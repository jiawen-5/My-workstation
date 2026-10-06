import { ref } from "vue";
import { PRI_COLOR } from "../constants/nav.js";
import { nowHM, dur } from "../composables/useDay.js";
import { sqlite, todayKey } from "../api/database.js";

/*
 * 唯一数据源：内存 ref + SQLite/localStorage 持久化。
 * - App 启动时调用 `load()` 一次；Tauri 内读 SQLite，当天没数据则写入种子；
 *   浏览器 dev 读 localStorage，没有则用种子。
 * - 之后所有变更先改内存（UI 立刻响应），再异步落盘，失败不阻塞交互。
 */

let nid = 1000;
const nextLocalId = () => ++nid;

function seedTasks() {
  return [
    { id: nextLocalId(), title: "复习计算机网络第三章", priority: "高", deadline: "今天 18:00", tags: ["秋招"], color: "#d4a5a5", mode: "sub", status: "doing", startAt: "08:00", endAt: "", newSub: "", editing: false,
      subs: [
        { id: nextLocalId(), text: "TCP 三次握手与四次挥手", done: false, startAt: "08:00", endAt: "" },
        { id: nextLocalId(), text: "HTTP / HTTPS 原理", done: true, startAt: "08:20", endAt: "08:55" },
        { id: nextLocalId(), text: "TCP 拥塞控制算法", done: false, startAt: "", endAt: "" },
      ] },
    { id: nextLocalId(), title: "LeetCode 每日刷题", priority: "中", deadline: "今天 22:00", tags: ["算法"], color: "#a8c5b8", mode: "sub", status: "doing", startAt: "10:00", endAt: "", newSub: "", editing: false,
      subs: [
        { id: nextLocalId(), text: "两数之和（简单）", done: true, startAt: "10:00", endAt: "10:15", note: "一遍过" },
        { id: nextLocalId(), text: "最长无重复子串（中等）", done: false, startAt: "", endAt: "", note: "需二刷" },
        { id: nextLocalId(), text: "合并 K 个升序链表（困难）", done: false, startAt: "", endAt: "" },
      ] },
    { id: nextLocalId(), title: "洗衣服", priority: "低", deadline: "", tags: ["生活"], color: "#e8d4b8", mode: "simple", status: "todo", startAt: "", endAt: "", editing: false, subs: [] },
    { id: nextLocalId(), title: "取快递", priority: "低", deadline: "", tags: [], color: "#b9b08a", mode: "simple", status: "done", startAt: "15:08", endAt: "15:20", editing: false, subs: [] },
  ];
}

function seedTimeline(taskIds) {
  return [
    { id: nextLocalId(), title: "早餐", range: "07:30 — 08:00", dur: "30分钟", color: "#e8d4b8", manual: false, bizDate: todayKey() },
    { id: nextLocalId(), title: "复习计算机网络第三章", range: "08:00 — 进行中", dur: "", color: "#d4a5a5", tag: "待办 · 已同步", active: true, taskId: taskIds[0], bizDate: todayKey() },
    { id: nextLocalId(), title: "LeetCode 每日刷题", range: "10:00 — 进行中", dur: "", color: "#a8c5b8", active: true, taskId: taskIds[1], bizDate: todayKey() },
    { id: nextLocalId(), title: "取快递", range: "15:08 — 15:20", dur: "12分钟", color: "#b9b08a", taskId: taskIds[3], bizDate: todayKey() },
  ];
}

const tasks = ref(seedTasks());
const timeline = ref(seedTimeline(tasks.value.map((t) => t.id)));
const loaded = ref(false);

function snapshot() {
  return {
    tasks: tasks.value.map((t) => ({ ...t, subs: t.subs.map((s) => ({ ...s })) })),
    timeline: timeline.value.map((e) => ({ ...e })),
  };
}

function persistFallback() {
  if (sqlite.isTauri()) return;
  sqlite.writeLS(snapshot());
}

/* ---- 时间轴同步（内存 + 落盘） ---- */
function pushTimeline(e) {
  const entry = { id: nextLocalId(), bizDate: todayKey(), ...e };
  timeline.value.push(entry);
  persistFallback();
  if (sqlite.isTauri()) sqlite.insertEntry(entry).then((id) => { if (id) entry.id = id; });
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
      if (cached?.tasks?.length) {
        tasks.value = cached.tasks;
        timeline.value = cached.timeline || [];
      }
      return;
    }
    // Tauri：读 SQLite
    const bizDate = todayKey();
    const data = await sqlite.loadDay(bizDate).catch(() => null);
    if (!data) return;
    if (!data.tasks.length) {
      // 首跑：种子写入库
      for (const t of tasks.value) {
        const id = await sqlite.insertTask({ ...t, tags: JSON.stringify(t.tags) });
        if (id) {
          const oldId = t.id;
          t.id = id;
          for (const s of t.subs) {
            const sid = await sqlite.insertSub(id, { ...s, done: !!s.done });
            if (sid) s.id = sid;
          }
          for (const e of timeline.value.filter((x) => x.taskId === oldId)) e.taskId = id;
        }
      }
      for (const e of timeline.value) {
        const id = await sqlite.insertEntry(e);
        if (id) e.id = id;
      }
      return;
    }
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
      const id = await sqlite.insertTask({ ...t, tags: JSON.stringify(t.tags) });
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
      const id = await sqlite.insertSub(t.id, s);
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
  const saveTimelineEntry = async (draft, editing) => {
    if (editing) {
      editing.title = draft.title;
      editing.range = draft.range;
      editing.manual = true;
      saveEntry(editing);
    } else {
      pushTimeline({ title: draft.title, range: draft.range, dur: "", color: "#b9b08a", manual: true });
    }
  };
  const delTimelineEntry = (e) => {
    timeline.value = timeline.value.filter((x) => x !== e);
    persistFallback();
    if (sqlite.isTauri()) sqlite.deleteEntry(e.id);
  };

  return { tasks, timeline, loaded, load, createTask, startTask, endSimple, reopenSimple, toggleSub, addSub, delSub, delTask, switchMode, saveTimelineEntry, delTimelineEntry };
}
