-- 秋招文章目录（两级树）：
--   parent_id = 0  → 一级节点（「秋招」下的直接子项）
--   parent_id > 0  → 二级节点（挂在某个一级节点下，不允许再往下创建）
-- content 直接跟着节点走，一篇节点就是一篇富文本文章。
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

CREATE INDEX IF NOT EXISTS idx_note_folder_parent ON note_folder(parent_id);

-- 数据库层也守住「最多两级」：往二级节点下插子节点直接报错
CREATE TRIGGER IF NOT EXISTS trg_note_folder_two_levels
BEFORE INSERT ON note_folder
WHEN NEW.parent_id > 0
 AND EXISTS (SELECT 1 FROM note_folder p WHERE p.id = NEW.parent_id AND p.parent_id > 0)
BEGIN
  SELECT RAISE(ABORT, 'note_folder allows at most two levels');
END;
