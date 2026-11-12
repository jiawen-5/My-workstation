import { computed, ref } from "vue";
import { sqlite } from "../api/database.js";
import { DEFAULT_PRIZES, MINUTES_PER_POINT, POMODORO_MINUTES } from "../constants/rewards.js";
import { bjDateKey, bjNowHM } from "../composables/useDay.js";

const LS_KEY = "workbench.rewards.v1";

const records = ref([]);
const items = ref([]);
const prizes = ref([]);
const loaded = ref(false);

/* 番茄钟状态放在模块级：切到别的板块再回来，计时不中断也不丢 */
const timerLeft = ref(POMODORO_MINUTES * 60);
const timerRunning = ref(false);
const timerRounds = ref(0);
const timerFlash = ref(false);
const timerNote = ref("");
let pomoTimer = null;
let flashTimer = null;

/* 时间戳沿用全站口径：北京时间「年-月-日 时:分」，历史记录按天筛选才对得上 */
export function pointStamp(d = new Date()) {
  return `${bjDateKey(d)} ${bjNowHM(d)}`;
}

const nextId = (list) => list.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0) + 1;

const rowToRecord = (r) => ({
  id: r.id,
  kind: r.kind,
  title: r.title || "",
  note: r.note || "",
  minutes: r.minutes || 0,
  points: r.points || 0,
  at: r.at || "",
  refId: r.ref_id ?? null,
});
const rowToItem = (r) => ({
  id: r.id,
  kind: r.kind,
  title: r.title || "",
  points: r.points || 0,
  done: !!r.done,
  doneAt: r.done_at || "",
});
const rowToPrize = (r) => ({
  id: r.id,
  name: r.name || "",
  cost: r.cost || 0,
  emoji: r.emoji || "🎁",
  note: r.note || "",
  used: r.used || 0,
});

/* 未完成排前面，同状态按创建顺序，弹窗里从上往下做就不会乱跳 */
const sortItems = (list) => [...list].sort((a, b) => Number(a.done) - Number(b.done) || a.id - b.id);

export function useRewards() {
  const persistLS = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ records: records.value, items: items.value, prizes: prizes.value }));
    } catch {
      /* 忽略配额错误 */
    }
  };

  const restoreLS = () => {
    try {
      const c = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!c) return false;
      records.value = c.records || [];
      items.value = c.items || [];
      prizes.value = c.prizes || [];
      return true;
    } catch {
      return false;
    }
  };

  const patchById = (listRef, id, patch) => {
    listRef.value = listRef.value.map((x) => (x.id === id ? { ...x, ...patch } : x));
  };

  const seedPrizes = async () => {
    prizes.value = DEFAULT_PRIZES.map((p, i) => ({ id: i + 1, used: 0, ...p }));
    if (!sqlite.isTauri()) return;
    for (const p of prizes.value) {
      const id = await sqlite.insertPrize(p).catch(() => null);
      if (id) patchById(prizes, p.id, { id });
    }
  };

  const load = async () => {
    if (loaded.value) return;
    loaded.value = true;
    if (!sqlite.isTauri()) {
      if (!restoreLS()) await seedPrizes();
      return;
    }
    const data = await sqlite.loadRewards().catch(() => null);
    if (!data) {
      if (!restoreLS()) await seedPrizes();
      return;
    }
    records.value = data.records.map(rowToRecord);
    items.value = data.items.map(rowToItem);
    prizes.value = data.prizes.map(rowToPrize);
    if (!prizes.value.length) await seedPrizes();
    persistLS();
  };

  const addRecord = async (r) => {
    const rec = {
      id: nextId(records.value),
      kind: r.kind,
      title: r.title || "",
      note: r.note || "",
      minutes: Math.round(Number(r.minutes) || 0),
      points: Math.round(Number(r.points) || 0),
      at: r.at || pointStamp(),
      refId: r.refId ?? null,
    };
    records.value = [rec, ...records.value];
    persistLS();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertPointRecord(rec).catch(() => null);
      if (id) patchById(records, rec.id, { id });
    }
    return rec;
  };

  const removeRecordsByRef = async (refId) => {
    const before = records.value.length;
    records.value = records.value.filter((r) => r.refId !== refId);
    if (records.value.length === before) return;
    persistLS();
    if (sqlite.isTauri()) await sqlite.deletePointRecordsByRef(refId).catch(() => {});
  };

  /* 学习时长按 25 分钟 = 1 积分四舍五入，不满半档不计分 */
  const addStudy = async ({ minutes, note = "", mode = "pomodoro", at = "" }) => {
    const min = Math.round(Number(minutes) || 0);
    const points = Math.round(min / MINUTES_PER_POINT);
    if (min <= 0 || points <= 0) return null;
    const title = mode === "pomodoro" ? `番茄专注 ${min} 分钟` : `学习 ${min} 分钟`;
    return addRecord({ kind: "study", title, note, minutes: min, points, at });
  };

  const completeTimer = async () => {
    pauseTimer();
    timerRounds.value += 1;
    const note = timerNote.value.trim();
    timerNote.value = "";
    timerLeft.value = POMODORO_MINUTES * 60;
    const rec = await addStudy({ minutes: POMODORO_MINUTES, note, mode: "pomodoro" });
    timerFlash.value = true;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (timerFlash.value = false), 5000);
    return rec;
  };

  const startTimer = () => {
    if (timerRunning.value) return;
    timerRunning.value = true;
    timerFlash.value = false;
    clearInterval(pomoTimer);
    pomoTimer = setInterval(() => {
      if (timerLeft.value <= 1) {
        completeTimer();
        return;
      }
      timerLeft.value -= 1;
    }, 1000);
  };

  const pauseTimer = () => {
    timerRunning.value = false;
    clearInterval(pomoTimer);
    pomoTimer = null;
  };

  const resetTimer = () => {
    pauseTimer();
    timerLeft.value = POMODORO_MINUTES * 60;
  };

  const addItem = async (kind, { title, points }) => {
    const t = String(title || "").trim();
    const p = Math.round(Number(points) || 0);
    if (!t || p <= 0) return null;
    const item = { id: nextId(items.value), kind, title: t, points: p, done: false, doneAt: "" };
    items.value = [...items.value, item];
    persistLS();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertRewardItem(item).catch(() => null);
      if (id) patchById(items, item.id, { id });
    }
    return item;
  };

  /* 勾选即结算积分，取消勾选把这一笔流水一起撤掉，账目始终对得上 */
  const toggleItem = async (item) => {
    const done = !item.done;
    const doneAt = done ? pointStamp() : "";
    patchById(items, item.id, { done, doneAt });
    persistLS();
    const fresh = items.value.find((x) => x.id === item.id);
    if (fresh && sqlite.isTauri()) await sqlite.updateRewardItem(fresh).catch(() => {});
    if (done) {
      await addRecord({ kind: item.kind, title: item.title, points: item.points, refId: item.id });
    } else {
      await removeRecordsByRef(item.id);
    }
  };

  const removeItem = async (item) => {
    items.value = items.value.filter((x) => x.id !== item.id);
    persistLS();
    if (sqlite.isTauri()) await sqlite.deleteRewardItem(item.id).catch(() => {});
    await removeRecordsByRef(item.id);
  };

  const addPrize = async ({ name, cost, emoji = "🎁", note = "" }) => {
    const n = String(name || "").trim();
    const c = Math.round(Number(cost) || 0);
    if (!n || c <= 0) return false;
    const prize = { id: nextId(prizes.value), name: n, cost: c, emoji: String(emoji || "🎁").trim() || "🎁", note: String(note || "").trim(), used: 0 };
    prizes.value = [...prizes.value, prize];
    persistLS();
    if (sqlite.isTauri()) {
      const id = await sqlite.insertPrize(prize).catch(() => null);
      if (id) patchById(prizes, prize.id, { id });
    }
    return true;
  };

  const removePrize = async (prize) => {
    prizes.value = prizes.value.filter((x) => x.id !== prize.id);
    persistLS();
    if (sqlite.isTauri()) await sqlite.deletePrize(prize.id).catch(() => {});
  };

  /* 兑换扣分：先校验余额，再写入一条负数流水，奖品累计兑换次数 +1 */
  const redeem = async (prize) => {
    const cost = Math.round(Number(prize.cost) || 0);
    if (cost <= 0) return { ok: false, reason: "invalid" };
    if (totalPoints.value < cost) return { ok: false, reason: "points", lack: cost - totalPoints.value };
    await addRecord({ kind: "redeem", title: `兑换 · ${prize.name}`, note: prize.note || "", points: -cost });
    patchById(prizes, prize.id, { used: (prize.used || 0) + 1 });
    persistLS();
    const fresh = prizes.value.find((x) => x.id === prize.id);
    if (fresh && sqlite.isTauri()) await sqlite.updatePrize(fresh).catch(() => {});
    return { ok: true };
  };

  const totalPoints = computed(() => records.value.reduce((n, r) => n + (Number(r.points) || 0), 0));
  const totalEarned = computed(() => records.value.reduce((n, r) => n + Math.max(0, Number(r.points) || 0), 0));
  const totalSpent = computed(() => records.value.reduce((n, r) => n + Math.max(0, -(Number(r.points) || 0)), 0));

  const todayRecords = computed(() => records.value.filter((r) => (r.at || "").slice(0, 10) === bjDateKey()));
  const todayEarned = computed(() => todayRecords.value.reduce((n, r) => n + Math.max(0, Number(r.points) || 0), 0));
  const todayStudyMinutes = computed(() => todayRecords.value.filter((r) => r.kind === "study").reduce((n, r) => n + (Number(r.minutes) || 0), 0));
  const todayStudyPoints = computed(() => todayRecords.value.filter((r) => r.kind === "study").reduce((n, r) => n + Math.max(0, Number(r.points) || 0), 0));

  const tasks = computed(() => sortItems(items.value.filter((i) => i.kind === "task")));
  const milestones = computed(() => sortItems(items.value.filter((i) => i.kind === "milestone")));
  const pendingCount = computed(() => items.value.filter((i) => !i.done).length);
  const sortedRecords = computed(() => [...records.value].sort((a, b) => `${b.at}${b.id}`.localeCompare(`${a.at}${a.id}`)));

  return {
    records,
    items,
    prizes,
    loaded,
    totalPoints,
    totalEarned,
    totalSpent,
    todayEarned,
    todayRecords,
    todayStudyMinutes,
    todayStudyPoints,
    tasks,
    milestones,
    pendingCount,
    sortedRecords,
    load,
    addStudy,
    addItem,
    toggleItem,
    removeItem,
    addPrize,
    removePrize,
    redeem,
    timerLeft,
    timerRunning,
    timerRounds,
    timerFlash,
    timerNote,
    startTimer,
    pauseTimer,
    resetTimer,
  };
}