/*
 * SQLite 持久层。
 * - Tauri 内：走 @tauri-apps/plugin-sql，数据库文件 workbench.db，
 *   建表由 Rust 端 migrations/001_init.sql 自动执行。
 * - 浏览器 `npm run dev`：插件不可用，自动降级为 localStorage，
 *   接口保持一致，所以 stores/workbench.js 不用关心环境。
 */

const LS_KEY = "workbench.sqlite.fallback.v1";

function isTauri() {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}

/*
 * 数据库位置：
 * - 生产（打包后）：sqlite:workbench.db → %APPDATA%\<identifier>\workbench.db，
 *   跟随系统用户走，重装/升级 App 数据还在，也不会污染项目目录。
 * - 开发（npm run tauri dev）：放到项目根目录 dev-workbench.db，
 *   方便直接用 DB Browser 打开看，也方便删库重来。
 *   改成本机路径即可，不影响生产。
 */
const DEV_DB_URL = "sqlite:D:/my-workstation/my_workstation/dev-workbench.db";
const PROD_DB_URL = "sqlite:workbench.db";

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
  end_at    TEXT NOT NULL DEFAULT ''
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
);`;

let db = null;
async function getDb() {
  if (!isTauri()) return null;
  if (!db) {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    // dev 用项目本地文件，生产用 App 数据目录
    const url = import.meta.env.DEV ? DEV_DB_URL : PROD_DB_URL;
    db = await Database.load(url);
    // 建表幂等：换了 URL（比如 dev 文件）也不依赖 Rust 端 migration
    for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.execute(stmt);
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

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const sqlite = {
  isTauri,

  async loadDay(bizDate) {
    const database = await getDb();
    if (!database) return null; // 调用方用种子数据 + localStorage
    const tasks = await database.select("SELECT * FROM tasks ORDER BY id DESC");
    const subs = await database.select("SELECT * FROM subtasks ORDER BY id ASC");
    const entries = await database.select("SELECT * FROM timeline_entries WHERE biz_date = $1 ORDER BY id ASC", [bizDate]);
    return { tasks, subs, entries };
  },

  async insertTask(t) {
    const database = await getDb();
    if (!database) return null;
    const r = await database.execute(
      "INSERT INTO tasks (title, priority, deadline, tags, color, mode, status, start_at, end_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [t.title, t.priority, t.deadline, t.tags, t.color, t.mode, t.status, t.startAt, t.endAt],
    );
    return r.lastInsertId;
  },
  async updateTask(t) {
    const database = await getDb();
    if (!database) return;
    await database.execute(
      "UPDATE tasks SET title=$1, priority=$2, deadline=$3, tags=$4, color=$5, mode=$6, status=$7, start_at=$8, end_at=$9 WHERE id=$10",
      [t.title, t.priority, t.deadline, t.tags, t.color, t.mode, t.status, t.startAt, t.endAt, t.id],
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

  rowToSub,
  rowToEntry,
  readLS,
  writeLS,
};
