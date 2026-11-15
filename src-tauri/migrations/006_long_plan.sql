-- 长期计划（读书 / 减肥）。
-- long_plans 一行一个计划（kind 唯一），周期和目标都放这张表：
--   targets 存 JSON，读书是每日阅读分钟数，减肥是起始/目标体重、每日饮水与摄入目标。

CREATE TABLE IF NOT EXISTS long_plans (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL UNIQUE,          -- reading | diet
  title      TEXT NOT NULL DEFAULT '',
  cycle_days INTEGER NOT NULL DEFAULT 30,
  start_date TEXT NOT NULL DEFAULT '',
  targets    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

-- 减肥流水一张表打天下：kind 区分 饮食/饮水/运动/体重
--   amount：食物的克数、饮水的毫升、运动的分钟、体重的公斤
--   kcal：饮食是摄入，运动是消耗，水和体重记 0
CREATE TABLE IF NOT EXISTS diet_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  biz_date TEXT NOT NULL DEFAULT '',
  kind     TEXT NOT NULL DEFAULT 'food',     -- food | water | exercise | weight
  name     TEXT NOT NULL DEFAULT '',
  amount   REAL NOT NULL DEFAULT 0,
  kcal     REAL NOT NULL DEFAULT 0,
  note     TEXT NOT NULL DEFAULT '',
  at       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_diet_logs_date ON diet_logs(biz_date);

-- 书单。text 放上传的 txt 原文，列表页不查它，点开阅读器时才按 id 单独取。
CREATE TABLE IF NOT EXISTS reading_books (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  author     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'reading',  -- reading | done
  progress   INTEGER NOT NULL DEFAULT 0,       -- 0-100
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
);
CREATE INDEX IF NOT EXISTS idx_reading_logs_date ON reading_logs(biz_date);
