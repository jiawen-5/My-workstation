-- 任务归属日期：总览月历按天归集任务，缺失该列时历史任务无法回溯
ALTER TABLE tasks ADD COLUMN biz_date TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(biz_date);
