/*
 * 长期计划 store：读书计划 + 减肥计划共用一份状态。
 *
 * 数据来源仍是 api/database.js（Tauri 走 SQLite，浏览器 dev 走 localStorage 镜像），
 * 这里只负责「计划配置 + 流水」的内存态与计算，视图层不再自己算热量。
 */

import { computed, ref } from "vue";
import { sqlite } from "../api/database.js";
import { addDays, bjDateKey, bjNowHM, keyToDate } from "../composables/useDay.js";
import { DEFAULT_TARGETS, PLAN_META } from "../constants/longplan.js";

const LS_KEY = "workbench.longplan.v1";
const TEXTS_KEY = "workbench.longplan.texts.v1";

const plans = ref([]);
const dietLogs = ref([]);
const books = ref([]);
const readingLogs = ref([]);
const texts = ref({});
const loaded = ref(false);

/* 时间戳口径跟全站一致：北京时间「年-月-日 时:分」 */
export function planStamp(d = new Date()) {
  return `${bjDateKey(d)} ${bjNowHM(d)}`;
}

const nextId = (list) => list.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0) + 1;
const sum = (list) => list.reduce((n, x) => n + (Number(x) || 0), 0);
const byTimeAsc = (a, b) => `${a.bizDate}${a.at}`.localeCompare(`${b.bizDate}${b.at}`);

export function useLongPlan() {
  const persist = () => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          plans: plans.value,
          dietLogs: dietLogs.value,
          books: books.value,
          readingLogs: readingLogs.value,
        }),
      );
    } catch {
      /* 配额不足时忽略，SQLite 才是正式数据源 */
    }
  };

  // txt 正文单独一个键：主状态的每次写入不该把几 MB 的正文重新序列化一遍
  const persistTexts = () => {
    try {
      localStorage.setItem(TEXTS_KEY, JSON.stringify(texts.value));
    } catch {
      /* 正文太大就只留在内存里，Tauri 下正文本来就在 SQLite */
    }
  };
  const restore = () => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "null");
    } catch {
      return null;
    }
  };
  const restoreTexts = () => {
    try {
      return JSON.parse(localStorage.getItem(TEXTS_KEY) || "{}") || {};
    } catch {
      return {};
    }
  };

  const load = async () => {
    if (loaded.value) return;
    loaded.value = true;
    const data = sqlite.isTauri() ? await sqlite.loadLongPlan().catch(() => null) : null;
    if (!data) {
      const c = restore();
      if (c) {
        plans.value = c.plans || [];
        dietLogs.value = c.dietLogs || [];
        books.value = c.books || [];
        readingLogs.value = c.readingLogs || [];
        texts.value = restoreTexts();
      }
      return;
    }
    plans.value = data.plans.map(sqlite.rowToPlan);
    dietLogs.value = data.diet.map(sqlite.rowToDiet);
    books.value = data.books.map(sqlite.rowToBook);
    readingLogs.value = data.reading.map(sqlite.rowToReading);
    persist();
  };

  /* ---- 计划配置：kind 一行，缺省值来自 constants，改了就 upsert ---- */

  const planOf = (kind) => {
    const row = plans.value.find((p) => p.kind === kind);
    return {
      kind,
      title: row?.title || PLAN_META[kind]?.title || "",
      cycleDays: Number(row?.cycleDays) || 30,
      startDate: row?.startDate || bjDateKey(),
      targets: { ...(DEFAULT_TARGETS[kind] || {}), ...(row?.targets || {}) },
    };
  };

  const savePlan = async (kind, patch) => {
    const cur = planOf(kind);
    const created = plans.value.find((p) => p.kind === kind)?.createdAt || planStamp();
    const next = {
      kind,
      title: patch.title ?? cur.title,
      cycleDays: Math.max(1, Math.round(Number(patch.cycleDays ?? cur.cycleDays) || 30)),
      startDate: patch.startDate ?? cur.startDate,
      targets: { ...cur.targets, ...(patch.targets || {}) },
      createdAt: created,
      updatedAt: planStamp(),
    };
    plans.value = plans.value.some((p) => p.kind === kind)
      ? plans.value.map((p) => (p.kind === kind ? next : p))
      : [...plans.value, next];
    persist();
    if (sqlite.isTauri()) await sqlite.upsertLongPlan(next).catch(() => {});
    return next;
  };

  /* 周期进度：第几天 / 共几天。开始日期填未来也算第 1 天，不出现负数 */
  const cycleOf = (kind) => {
    const plan = planOf(kind);
    const total = Math.max(1, plan.cycleDays);
    const passed = Math.round((keyToDate(bjDateKey()) - keyToDate(plan.startDate)) / 86400000) + 1;
    const day = Math.min(Math.max(passed, 1), total);
    return {
      total,
      passed,
      day,
      left: Math.max(total - passed, 0),
      percent: Math.round((day / total) * 100),
      overrun: passed > total,
      startDate: plan.startDate,
    };
  };

  /* ---- 减肥流水 ---- */

  const dietOn = (dateKey) => dietLogs.value.filter((l) => l.bizDate === dateKey);

  const dietSummary = (dateKey) => {
    const list = dietOn(dateKey);
    const food = list.filter((l) => l.kind === "food");
    const water = list.filter((l) => l.kind === "water");
    const sport = list.filter((l) => l.kind === "exercise");
    const intake = sum(food.map((l) => l.kcal));
    const burn = sum(sport.map((l) => l.kcal));
    return {
      list,
      food,
      water,
      sport,
      intake,
      burn,
      waterMl: sum(water.map((l) => l.amount)),
      net: intake - burn,
    };
  };

  const weightLogs = computed(() =>
    dietLogs.value.filter((l) => l.kind === "weight").sort((a, b) => byTimeAsc(b, a)),
  );
  const latestWeight = computed(() => (weightLogs.value[0] ? Number(weightLogs.value[0].amount) || 0 : 0));

  /* 运动消耗要用体重：没记过体重就用计划里的起始体重兜底 */
  const bodyWeight = computed(() => {
    const w = latestWeight.value;
    return w > 0 ? w : Number(planOf("diet").targets.startWeight) || 60;
  });

  const addDiet = async ({ kind, name = "", amount = 0, kcal = 0, note = "", bizDate = bjDateKey() }) => {
    const row = {
      id: nextId(dietLogs.value),
      bizDate,
      kind,
      name: String(name || "").trim(),
      amount: Number(amount) || 0,
      kcal: Math.round(Number(kcal) || 0),
      note: note || "",
      at: planStamp(),
    };
    dietLogs.value = [row, ...dietLogs.value];
    persist();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertDietLog(row).catch(() => null);
      if (id) dietLogs.value = dietLogs.value.map((x) => (x.id === row.id ? { ...x, id } : x));
    }
    return row;
  };

  const removeDiet = async (id) => {
    dietLogs.value = dietLogs.value.filter((l) => l.id !== id);
    persist();
    if (sqlite.isTauri()) await sqlite.deleteDietLog(id).catch(() => {});
  };

  /* ---- 书单 + 阅读时长 ---- */

  const addBook = async ({ title, author = "" }) => {
    const name = String(title || "").trim();
    if (!name) return null;
    const at = planStamp();
    const tempId = nextId(books.value);
    let row = { id: tempId, title: name, author: String(author || "").trim(), status: "reading", progress: 0, charCount: 0, createdAt: at, updatedAt: at };
    books.value = [row, ...books.value];
    persist();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertBook(row).catch(() => null);
      if (id) {
        row = { ...row, id: Number(id) };
        books.value = books.value.map((b) => (b.id === tempId ? row : b));
      }
    }
    return row;
  };

  const patchBook = async (book, patch) => {
    const next = { ...book, ...patch, updatedAt: planStamp() };
    books.value = books.value.map((b) => (b.id === book.id ? next : b));
    persist();
    if (sqlite.isTauri()) await sqlite.updateBook(next).catch(() => {});
    return next;
  };

  /* 上传 txt：正文本地缓存在 texts，Tauri 下同时落 SQLite（列表查询不读它） */
  const uploadText = async (book, text) => {
    const charCount = String(text || "").replace(/\s/g, "").length;
    texts.value = { ...texts.value, [book.id]: text };
    persistTexts();
    if (sqlite.isTauri()) await sqlite.saveBookText(book.id, text, charCount, planStamp()).catch(() => {});
    return await patchBook(book, { charCount });
  };

  const readText = async (id) => {
    if (texts.value[id]) return texts.value[id];
    if (!sqlite.isTauri()) return "";
    const text = await sqlite.loadBookText(id).catch(() => "");
    if (text) texts.value = { ...texts.value, [id]: text };
    return text;
  };

  const removeBook = async (book) => {
    books.value = books.value.filter((b) => b.id !== book.id);
    const rest = { ...texts.value };
    delete rest[book.id];
    texts.value = rest;
    persist();
    persistTexts();
    if (sqlite.isTauri()) await sqlite.deleteBook(book.id).catch(() => {});
  };

  const readingOn = (dateKey) => readingLogs.value.filter((l) => l.bizDate === dateKey);
  const minutesOn = (dateKey) => sum(readingOn(dateKey).map((l) => l.minutes));

  const addReading = async ({ bookId, minutes, pages = 0, note = "", bizDate = bjDateKey() }) => {
    const min = Math.round(Number(minutes) || 0);
    if (min <= 0) return null;
    const book = books.value.find((b) => b.id === bookId);
    const row = {
      id: nextId(readingLogs.value),
      bookId: book?.id ?? null,
      bookTitle: book?.title || "未指定书目",
      bizDate,
      minutes: min,
      pages: Math.round(Number(pages) || 0),
      note: note || "",
      at: planStamp(),
    };
    readingLogs.value = [row, ...readingLogs.value];
    persist();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertReadingLog(row).catch(() => null);
      if (id) readingLogs.value = readingLogs.value.map((x) => (x.id === row.id ? { ...x, id } : x));
    }
    return row;
  };

  const removeReading = async (id) => {
    readingLogs.value = readingLogs.value.filter((l) => l.id !== id);
    persist();
    if (sqlite.isTauri()) await sqlite.deleteReadingLog(id).catch(() => {});
  };

  const bookMinutes = (bookId) => sum(readingLogs.value.filter((l) => l.bookId === bookId).map((l) => l.minutes));
  const totalMinutes = computed(() => sum(readingLogs.value.map((l) => l.minutes)));
  const todayMinutes = computed(() => minutesOn(bjDateKey()));

  const activeBooks = computed(() => books.value.filter((b) => b.status !== "done"));
  const doneBooks = computed(() => books.value.filter((b) => b.status === "done"));

  /* 最近 N 天的柱状数据：卡片和详情页的迷你趋势共用 */
  const recentDays = (days = 7) => {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = addDays(bjDateKey(), -i);
      out.push({ key, day: key.slice(8), minutes: minutesOn(key), intake: dietSummary(key).intake });
    }
    return out;
  };

  return {
    plans,
    dietLogs,
    books,
    readingLogs,
    texts,
    loaded,
    load,
    planOf,
    savePlan,
    cycleOf,
    dietOn,
    dietSummary,
    weightLogs,
    latestWeight,
    bodyWeight,
    addDiet,
    removeDiet,
    addBook,
    patchBook,
    uploadText,
    readText,
    removeBook,
    readingOn,
    minutesOn,
    addReading,
    removeReading,
    bookMinutes,
    totalMinutes,
    todayMinutes,
    activeBooks,
    doneBooks,
    recentDays,
  };
}
