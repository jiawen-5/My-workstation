# My Workstation · 个人综合工作台

韩式极简风个人工作台：待办任务与今日时间轴双向联动，本地优先（SQLite），
无账号、无云端，开箱即用。

## 技术栈

Tauri 2 · Vue 3 · Tailwind CSS 4 · SQLite (tauri-plugin-sql)

## 功能（已完成）

- 待办：可拆分子任务 / 无需拆分两种模式，开始·结束自动同步时间轴
- 时间轴：今日记录 + 手动补录 / 修改 / 删除
- 韩式极简 UI：浅色 / 柔和深色主题

## 本地运行

```bash
npm install
npm run tauri dev