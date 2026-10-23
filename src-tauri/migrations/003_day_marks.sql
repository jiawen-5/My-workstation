-- 每日起床/休息打卡：时间轴支持按日期补录（起床记开始时间，休息记结束时间）
CREATE TABLE IF NOT EXISTS day_marks (
  biz_date TEXT PRIMARY KEY,
  wake     TEXT NOT NULL DEFAULT '',
  rest     TEXT NOT NULL DEFAULT ''
);
