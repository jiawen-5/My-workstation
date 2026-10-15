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
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

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
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_entries(biz_date);

CREATE TABLE IF NOT EXISTS growth_logs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  event     TEXT NOT NULL,
  category  TEXT NOT NULL DEFAULT '',
  mood      TEXT NOT NULL DEFAULT '',
  content   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_growth_created ON growth_logs(created_at);
CREATE TABLE IF NOT EXISTS journal_categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS journal_moods (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE
);
