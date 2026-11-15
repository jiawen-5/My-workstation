/*
 * SQLite 持久层。
 * - Tauri 内：走 @tauri-apps/plugin-sql，数据库文件 workbench.db，
 *   建表由 Rust 端 migrations/001_init.sql 自动执行。
 * - 浏览器 `npm run dev`：插件不可用，自动降级为 localStorage，
 *   接口保持一致，所以 stores/workbench.js 不用关心环境。
 */

import { bjDateKey } from "../composables/useDay.js";

const LS_KEY = "workbench.sqlite.fallback.v1";

function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}

/*
 * 数据库位置：sqlite:workbench.db
 * tauri-plugin-sql 会把相对路径解析到 App 配置目录：
 *   %APPDATA%\<identifier>\workbench.db
 * 跟随系统用户走，重装/升级 App 数据都还在，也不会污染项目目录。
 * 开发（npm run tauri dev）与打包后共用这一个库：
 * 开发时看到的就是打包后的样子，不会出现「开发有、正式版没有」。
 */
const DB_URL = "sqlite:workbench.db";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  priority  TEXT NOT NULL DEFAULT '中',
  deadline  TEXT NOT NULL DEFAULT '',
  tags      TEXT NOT NULL DEFAULT '[]',
  color     TEXT NOT NULL DEFAULT '#a8c5b8',
  mode      TEXT NOT NULL DEFAULT 'sub',
  status    TEXT NOT NULL DEFAULT 'todo',
  start_at  TEXT NOT NULL DEFAULT '',
  end_at    TEXT NOT NULL DEFAULT '',
  biz_date  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS subtasks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text      TEXT NOT NULL,
  done      INTEGER NOT NULL DEFAULT 0,
  start_at  TEXT NOT NULL DEFAULT '',
  end_at    TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS timeline_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  time_range TEXT NOT NULL DEFAULT '',
  duration  TEXT NOT NULL DEFAULT '',
  color     TEXT NOT NULL DEFAULT '#a8c5b8',
  tag       TEXT NOT NULL DEFAULT '',
  manual    INTEGER NOT NULL DEFAULT 0,
  active    INTEGER NOT NULL DEFAULT 0,
  task_id   INTEGER NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sub_id    INTEGER NULL,
  biz_date  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS growth_logs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  event     TEXT NOT NULL,
  category  TEXT NOT NULL DEFAULT '',
  mood      TEXT NOT NULL DEFAULT '',
  content   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS journal_categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS journal_moods (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS day_marks (
  biz_date  TEXT PRIMARY KEY,
  wake      TEXT NOT NULL DEFAULT '',
  rest      TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS point_records (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kind      TEXT NOT NULL DEFAULT 'task',
  title     TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT '',
  minutes   INTEGER NOT NULL DEFAULT 0,
  points    INTEGER NOT NULL DEFAULT 0,
  at        TEXT NOT NULL DEFAULT '',
  ref_id    INTEGER NULL
);
CREATE TABLE IF NOT EXISTS reward_items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kind      TEXT NOT NULL DEFAULT 'task',
  title     TEXT NOT NULL DEFAULT '',
  points    INTEGER NOT NULL DEFAULT 0,
  done      INTEGER NOT NULL DEFAULT 0,
  done_at   TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS reward_prizes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL DEFAULT '',
  cost      INTEGER NOT NULL DEFAULT 0,
  emoji     TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT '',
  used      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS note_folder (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT '',
  parent_id  INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS long_plans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL DEFAULT '',
  cycle_days INTEGER NOT NULL DEFAULT 30,
  start_date TEXT NOT NULL DEFAULT '',
  targets    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS diet_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_date TEXT NOT NULL DEFAULT '',
  kind     TEXT NOT NULL DEFAULT 'food',
  name     TEXT NOT NULL DEFAULT '',
  amount   REAL NOT NULL DEFAULT 0,
  kcal     REAL NOT NULL DEFAULT 0,
  note     TEXT NOT NULL DEFAULT '',
  at       TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS reading_books (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  author     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'reading',
  progress   INTEGER NOT NULL DEFAULT 0,
  char_count INTEGER NOT NULL DEFAULT 0,
  text       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS reading_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id    INTEGER NULL,
  book_title TEXT NOT NULL DEFAULT '',
  biz_date   TEXT NOT NULL DEFAULT '',
  minutes    INTEGER NOT NULL DEFAULT 0,
  pages      INTEGER NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  at         TEXT NOT NULL DEFAULT ''
);`;

let db = null;
async function getDb() {
  if (!isTauri()) return null;
  if (!db) {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    db = await Database.load(DB_URL);
    // 建表幂等：即使 Rust 端 migration 没跑，这里也能把表补齐
    for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.execute(stmt);
    }
    // 老库升级：tasks 表补上 biz_date（新库建表时已带，重复执行会报错，忽略即可）
    try {
      await db.execute("ALTER TABLE tasks ADD COLUMN biz_date TEXT NOT NULL DEFAULT ''");
    } catch {
      /* 列已存在 */
    }
    try {
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(biz_date)");
    } catch {
      /* 索引已存在 */
    }
    try {
      await db.execute("CREATE INDEX IF NOT EXISTS idx_note_folder_parent ON note_folder(parent_id)");
    } catch {
      /* 索引已存在 */
    }
    try {
      await db.execute("CREATE INDEX IF NOT EXISTS idx_diet_logs_date ON diet_logs(biz_date)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_reading_logs_date ON reading_logs(biz_date)");
    } catch {
      /* 索引已存在 */
    }
    // 数据库层再兜一道：二级节点（parent_id > 0）下面不允许再挂子节点
    try {
      await db.execute(
        `CREATE TRIGGER IF NOT EXISTS trg_note_folder_two_levels
         BEFORE INSERT ON note_folder
         WHEN NEW.parent_id > 0
          AND EXISTS (SELECT 1 FROM note_folder p WHERE p.id = NEW.parent_id AND p.parent_id > 0)
         BEGIN
           SELECT RAISE(ABORT, 'note_folder allows at most two levels');
         END`,
      );
    } catch {
      /* 触发器已存在 */
    }
  }
  return db;
}

function readLS() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "null");
  } catch {
    return null;
  }
}
function writeLS(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* 忽略配额错误 */
  }
}

const rowToSub = (r) => ({
  id: r.id,
  taskId: r.task_id,
  text: r.text,
  done: !!r.done,
  startAt: r.start_at || "",
  endAt: r.end_at || "",
  note: r.note || "",
});

const rowToEntry = (r) => ({
  id: r.id,
  title: r.title,
  range: r.time_range || "",
  dur: r.duration || "",
  color: r.color,
  tag: r.tag || "",
  manual: !!r.manual,
  active: !!r.active,
  taskId: r.task_id ?? null,
  subId: r.sub_id ?? null,
  bizDate: r.biz_date || "",
});

const rowToLog = (r) => ({
  id: r.id,
  event: r.event,
  category: r.category || "",
  mood: r.mood || "",
  content: r.content || "",
  createdAt: r.created_at || "",
});

const rowToNote = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category || "",
  parentId: r.parent_id || 0,
  sortOrder: r.sort_order || 0,
  content: r.content || "",
  createdAt: r.created_at || "",
  updatedAt: r.updated_at || "",
});

const safeJson = (raw) => {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

const rowToPlan = (r) => ({
  kind: r.kind,
  title: r.title || "",
  cycleDays: r.cycle_days || 30,
  startDate: r.start_date || "",
  targets: safeJson(r.targets),
  createdAt: r.created_at || "",
  updatedAt: r.updated_at || "",
});

const rowToDiet = (r) => ({
  id: r.id,
  bizDate: r.biz_date || "",
  kind: r.kind || "food",
  name: r.name || "",
  amount: Number(r.amount) || 0,
  kcal: Number(r.kcal) || 0,
  note: r.note || "",
  at: r.at || "",
});

const rowToBook = (r) => ({
  id: r.id,
  title: r.title || "",
  author: r.author || "",
  status: r.status || "reading",
  progress: r.progress || 0,
  charCount: r.char_count || 0,
  createdAt: r.created_at || "",
  updatedAt: r.updated_at || "",
});

const rowToReading = (r) => ({
  id: r.id,
  bookId: r.book_id ?? null,
  bookTitle: r.book_title || "",
  bizDate: r.biz_date || "",
  minutes: r.minutes || 0,
  pages: r.pages || 0,
  note: r.note || "",
  at: r.at || "",
});

/* 业务日期一律按北京时间（UTC+8）取，机器时区不影响「今天」是哪一天 */
export const todayKey = bjDateKey;

export const sqlite = {
  isTauri,

  /*
   * 一次读全量任务 + 子任务 + 时间轴：总览月历要按天归集所有历史/未来任务，
   * 单人工作台的数据量（百级）直接全量读比按月分页省事，切换年月不再等 IO。
   */
  async loadAll() {
    const database = await getDb();
    if (!database) return null; // 调用方用 localStorage
    const tasks = await database.select("SELECT * FROM tasks ORDER BY id DESC");
    const subs = await database.select("SELECT * FROM subtasks ORDER BY id ASC");
    const entries = await database.select("SELECT * FROM timeline_entries ORDER BY id ASC");
    const marks = await database.select("SELECT * FROM day_marks");
    return { tasks, subs, entries, marks };
  },

  /* 起床/休息按日期唯一：补录就是 upsert，同一天反复改不会产生多行 */
  async upsertMark(bizDate, wake, rest) {
    const database = await getDb();
    if (!database) return;
    await database.execute(
      "INSERT INTO day_marks (biz_date, wake, rest) VALUES ($1,$2,$3) ON CONFLICT(biz_date) DO UPDATE SET wake=$2, rest=$3",
      [bizDate, wake || "", rest || ""],
    );
  },

  /*
   * 历史数据补齐归属日期：老版本没有 biz_date 的任务/时间轴，
   * 第一次读到时就地打上今天，避免它们从月历上凭空消失。
   */
  async backfillDates(bizDate) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE tasks SET biz_date = $1 WHERE biz_date = '' OR biz_date IS NULL", [bizDate]);
    await database.execute("UPDATE timeline_entries SET biz_date = $1 WHERE biz_date = '' OR biz_date IS NULL", [bizDate]);
  },

  async insertTask(t) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO tasks (title, priority, deadline, tags, color, mode, status, start_at, end_at, biz_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [t.title, t.priority, t.deadline, t.tags, t.color, t.mode, t.status, t.startAt, t.endAt, t.bizDate],
    );
    return r.lastInsertId;
  },
  async updateTask(t) {
    const database = await getDb();
    if (!database) return;
    await database.execute(
      "UPDATE tasks SET title=$1, priority=$2, deadline=$3, tags=$4, color=$5, mode=$6, status=$7, start_at=$8, end_at=$9, biz_date=$10 WHERE id=$11",
      [t.title, t.priority, t.deadline, t.tags, t.color, t.mode, t.status, t.startAt, t.endAt, t.bizDate, t.id],
    );
  },
  async deleteTask(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM subtasks WHERE task_id=$1", [id]);
    await database.execute("DELETE FROM timeline_entries WHERE task_id=$1", [id]);
    await database.execute("DELETE FROM tasks WHERE id=$1", [id]);
  },

  async insertSub(taskId, s) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO subtasks (task_id, text, done, start_at, end_at, note) VALUES ($1,$2,$3,$4,$5,$6)",
      [taskId, s.text, s.done ? 1 : 0, s.startAt, s.endAt, s.note || ""],
    );
    return r.lastInsertId;
  },
  async updateSub(s) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE subtasks SET text=$1, done=$2, start_at=$3, end_at=$4, note=$5 WHERE id=$6", [
      s.text, s.done ? 1 : 0, s.startAt, s.endAt, s.note || "", s.id,
    ]);
  },
  async deleteSub(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM subtasks WHERE id=$1", [id]);
    await database.execute("DELETE FROM timeline_entries WHERE sub_id=$1", [id]);
  },

  async insertEntry(e) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO timeline_entries (title, time_range, duration, color, tag, manual, active, task_id, sub_id, biz_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [e.title, e.range, e.dur, e.color, e.tag || "", e.manual ? 1 : 0, e.active ? 1 : 0, e.taskId ?? null, e.subId ?? null, e.bizDate],
    );
    return r.lastInsertId;
  },
  async updateEntry(e) {
    const database = await getDb();
    if (!database) return;
    await database.execute(
      "UPDATE timeline_entries SET title=$1, time_range=$2, duration=$3, color=$4, tag=$5, manual=$6, active=$7 WHERE id=$8",
      [e.title, e.range, e.dur, e.color, e.tag || "", e.manual ? 1 : 0, e.active ? 1 : 0, e.id],
    );
  },
  async deleteEntry(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM timeline_entries WHERE id=$1", [id]);
  },

  async loadJournal() {
    const database = await getDb();
    if (!database) return null;
    const logs = await database.select("SELECT * FROM growth_logs ORDER BY created_at DESC, id DESC");
    const cats = await database.select("SELECT name FROM journal_categories ORDER BY id ASC");
    const moods = await database.select("SELECT name FROM journal_moods ORDER BY id ASC");
    return { logs, cats: cats.map((r) => r.name), moods: moods.map((r) => r.name) };
  },
  async insertLog(l) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO growth_logs (event, category, mood, content, created_at) VALUES ($1,$2,$3,$4,$5)",
      [l.event, l.category || "", l.mood || "", l.content || "", l.createdAt],
    );
    return r.lastInsertId;
  },
  async updateLog(l) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE growth_logs SET event=$1, category=$2, mood=$3, content=$4 WHERE id=$5", [
      l.event, l.category || "", l.mood || "", l.content || "", l.id,
    ]);
  },
  async deleteLog(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM growth_logs WHERE id=$1", [id]);
  },
  async addCategory(name) {
    const database = await getDb();
    if (!database) return;
    await database.execute("INSERT OR IGNORE INTO journal_categories (name) VALUES ($1)", [name]);
  },
  async addMood(name) {
    const database = await getDb();
    if (!database) return;
    await database.execute("INSERT OR IGNORE INTO journal_moods (name) VALUES ($1)", [name]);
  },

  /* ---- 积分兑换：流水 / 任务条目 / 奖品三张表 ---- */
  async loadRewards() {
    const database = await getDb();
    if (!database) return null;
    const records = await database.select("SELECT * FROM point_records ORDER BY id DESC");
    const items = await database.select("SELECT * FROM reward_items ORDER BY id ASC");
    const prizes = await database.select("SELECT * FROM reward_prizes ORDER BY id ASC");
    return { records, items, prizes };
  },
  async insertPointRecord(r) {
    const database = await getDb();
    if (!database) return null;
    const res = await database.execute(
      "INSERT INTO point_records (kind, title, note, minutes, points, at, ref_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [r.kind, r.title || "", r.note || "", r.minutes || 0, r.points || 0, r.at || "", r.refId ?? null],
    );
    return res.lastInsertId;
  },
  async deletePointRecordsByRef(refId) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM point_records WHERE ref_id = $1", [refId]);
  },
  async insertRewardItem(t) {
    const database = await getDb();
    if (!database) return null;
    const res = await database.execute(
      "INSERT INTO reward_items (kind, title, points, done, done_at) VALUES ($1,$2,$3,$4,$5)",
      [t.kind, t.title, t.points || 0, t.done ? 1 : 0, t.doneAt || ""],
    );
    return res.lastInsertId;
  },
  async updateRewardItem(t) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE reward_items SET title=$1, points=$2, done=$3, done_at=$4 WHERE id=$5", [
      t.title, t.points || 0, t.done ? 1 : 0, t.doneAt || "", t.id,
    ]);
  },
  async deleteRewardItem(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM reward_items WHERE id=$1", [id]);
  },
  async insertPrize(p) {
    const database = await getDb();
    if (!database) return null;
    const res = await database.execute(
      "INSERT INTO reward_prizes (name, cost, emoji, note, used) VALUES ($1,$2,$3,$4,$5)",
      [p.name, p.cost || 0, p.emoji || "", p.note || "", p.used || 0],
    );
    return res.lastInsertId;
  },
  async updatePrize(p) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE reward_prizes SET name=$1, cost=$2, emoji=$3, note=$4, used=$5 WHERE id=$6", [
      p.name, p.cost || 0, p.emoji || "", p.note || "", p.used || 0, p.id,
    ]);
  },
  async deletePrize(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM reward_prizes WHERE id=$1", [id]);
  },

  /*
   * ---- 秋招文章目录：只允许两级 ----
   * parent_id = 0 → 一级节点（「秋招」下直接子项），> 0 → 二级节点。
   * 「二级不能再建子节点」由 stores/notes.js 把关；
   * 删一级节点时先清掉挂在它下面的二级节点，做到级联删除。
   */
  async loadNoteFolders() {
    const database = await getDb();
    if (!database) return null;
    return await database.select("SELECT * FROM note_folder ORDER BY sort_order ASC, id ASC");
  },
  async insertNoteFolder(n) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO note_folder (name, category, parent_id, sort_order, content, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [n.name, n.category || "", n.parentId || 0, n.sortOrder || 0, n.content || "", n.createdAt || "", n.updatedAt || ""],
    );
    return r.lastInsertId;
  },
  async updateNoteFolder(n) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE note_folder SET name=$1, category=$2 WHERE id=$3", [
      n.name, n.category || "", n.id,
    ]);
  },
  async deleteNoteFolder(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM note_folder WHERE parent_id=$1", [id]);
    await database.execute("DELETE FROM note_folder WHERE id=$1", [id]);
  },
  async saveNoteFolderContent(id, content, updatedAt) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE note_folder SET content=$1, updated_at=$2 WHERE id=$3", [
      content || "", updatedAt || "", id,
    ]);
  },

  /*
   * ---- 长期计划：读书 / 减肥 ----
   * 一次读全量（单个用户，百级数据），列表页不取 reading_books.text，
   * 上传的 txt 正文等点开阅读器时再用 loadBookText 按 id 单独拿。
   */
  async loadLongPlan() {
    const database = await getDb();
    if (!database) return null;
    const plans = await database.select("SELECT * FROM long_plans");
    const diet = await database.select("SELECT * FROM diet_logs ORDER BY id DESC");
    const books = await database.select(
      "SELECT id, title, author, status, progress, char_count, created_at, updated_at FROM reading_books ORDER BY id DESC",
    );
    const reading = await database.select("SELECT * FROM reading_logs ORDER BY id DESC");
    return { plans, diet, books, reading };
  },
  /* 计划配置一个 kind 只有一行：改周期/目标就是 upsert */
  async upsertLongPlan(p) {
    const database = await getDb();
    if (!database) return;
    await database.execute(
      `INSERT INTO long_plans (kind, title, cycle_days, start_date, targets, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(kind) DO UPDATE SET title=$2, cycle_days=$3, start_date=$4, targets=$5, updated_at=$7`,
      [p.kind, p.title || "", p.cycleDays || 30, p.startDate || "", JSON.stringify(p.targets || {}), p.createdAt || "", p.updatedAt || ""],
    );
  },

  async insertDietLog(l) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO diet_logs (biz_date, kind, name, amount, kcal, note, at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [l.bizDate, l.kind, l.name || "", l.amount || 0, l.kcal || 0, l.note || "", l.at || ""],
    );
    return r.lastInsertId;
  },
  async deleteDietLog(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM diet_logs WHERE id=$1", [id]);
  },

  async insertBook(b) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO reading_books (title, author, status, progress, char_count, text, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [b.title, b.author || "", b.status || "reading", b.progress || 0, b.charCount || 0, b.text || "", b.createdAt || "", b.updatedAt || ""],
    );
    return r.lastInsertId;
  },
  async updateBook(b) {
    const database = await getDb();
    if (!database) return;
    await database.execute(
      "UPDATE reading_books SET title=$1, author=$2, status=$3, progress=$4, char_count=$5, updated_at=$6 WHERE id=$7",
      [b.title, b.author || "", b.status || "reading", b.progress || 0, b.charCount || 0, b.updatedAt || "", b.id],
    );
  },
  /* txt 正文单独落库，避免列表查询把它一起读出来 */
  async saveBookText(id, text, charCount, updatedAt) {
    const database = await getDb();
    if (!database) return;
    await database.execute("UPDATE reading_books SET text=$1, char_count=$2, updated_at=$3 WHERE id=$4", [
      text || "", charCount || 0, updatedAt || "", id,
    ]);
  },
  async loadBookText(id) {
    const database = await getDb();
    if (!database) return "";
    const rows = await database.select("SELECT text FROM reading_books WHERE id=$1", [id]);
    return rows[0]?.text || "";
  },
  async deleteBook(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM reading_books WHERE id=$1", [id]);
  },

  async insertReadingLog(l) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO reading_logs (book_id, book_title, biz_date, minutes, pages, note, at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [l.bookId ?? null, l.bookTitle || "", l.bizDate, l.minutes || 0, l.pages || 0, l.note || "", l.at || ""],
    );
    return r.lastInsertId;
  },
  async deleteReadingLog(id) {
    const database = await getDb();
    if (!database) return;
    await database.execute("DELETE FROM reading_logs WHERE id=$1", [id]);
  },

  rowToSub,
  rowToEntry,
  rowToLog,
  rowToNote,
  rowToPlan,
  rowToDiet,
  rowToBook,
  rowToReading,
  readLS,
  writeLS,
};
