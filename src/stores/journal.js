import { computed, ref } from "vue";
import { sqlite } from "../api/database.js";
import { DEFAULT_CATEGORIES, DEFAULT_MOODS } from "../constants/journal.js";

const LS_KEY = "workbench.journal.v1";

let nid = 100000;
const nextId = () => ++nid;

const logs = ref([]);
const categories = ref([...DEFAULT_CATEGORIES]);
const moods = ref([...DEFAULT_MOODS]);
const loaded = ref(false);

const pad = (n) => String(n).padStart(2, "0");
export function nowStamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function persistLS() {
  // Tauri 内也写一份 localStorage 镜像：SQL 失败时刷新仍有兜底，不丢数据
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ logs: logs.value, categories: categories.value, moods: moods.value }));
  } catch { /* ignore */ }
}

function restoreLS() {
  try {
    const c = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (c) {
      logs.value = c.logs || [];
      if (c.categories?.length) categories.value = c.categories;
      if (c.moods?.length) moods.value = c.moods;
    }
  } catch { /* ignore */ }
}

export function useJournal() {
  const load = async () => {
    if (loaded.value) return;
    loaded.value = true;
    if (!sqlite.isTauri()) {
      restoreLS();
      return;
    }
    const data = await sqlite.loadJournal().catch(() => null);
    if (!data) { restoreLS(); return; }
    logs.value = data.logs.map(sqlite.rowToLog);
    const customCats = [...new Set([...DEFAULT_CATEGORIES, ...data.cats])];
    const customMoods = [...new Set([...DEFAULT_MOODS, ...data.moods])];
    categories.value = customCats;
    moods.value = customMoods;
    // 把预设写入库，保证多端一致
    for (const n of DEFAULT_CATEGORIES) await sqlite.addCategory(n).catch(() => {});
    for (const n of DEFAULT_MOODS) await sqlite.addMood(n).catch(() => {});
  };

  const save = async (draft, editing) => {
    if (editing) {
      Object.assign(editing, { event: draft.event, category: draft.category, mood: draft.mood, content: draft.content });
      persistLS();
      if (sqlite.isTauri()) await sqlite.updateLog(editing).catch(() => {});
    } else {
      const l = { id: nextId(), event: draft.event, category: draft.category, mood: draft.mood, content: draft.content, createdAt: nowStamp() };
      logs.value.unshift(l);
      persistLS();
      if (sqlite.isTauri()) {
        const id = await sqlite.insertLog(l).catch(() => null);
        if (id) l.id = id;
      }
    }
  };
  const remove = (l) => {
    logs.value = logs.value.filter((x) => x !== l);
    persistLS();
    if (sqlite.isTauri()) sqlite.deleteLog(l.id).catch(() => {});
  };
  const addCategory = async (name) => {
    const v = (name || "").trim();
    if (!v || categories.value.includes(v)) return false;
    categories.value.push(v);
    persistLS();
    if (sqlite.isTauri()) await sqlite.addCategory(v).catch(() => {});
    return true;
  };
  const addMood = async (name) => {
    const v = (name || "").trim();
    if (!v || moods.value.includes(v)) return false;
    moods.value.push(v);
    persistLS();
    if (sqlite.isTauri()) await sqlite.addMood(v).catch(() => {});
    return true;
  };

  const sorted = computed(() => [...logs.value].sort((a, b) => (b.createdAt + b.id).localeCompare(a.createdAt + a.id)));

  return { logs, categories, moods, sorted, loaded, load, save, remove, addCategory, addMood };
}
