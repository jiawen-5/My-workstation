export const ICONS = {
  待办: '<path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-linecap="round" stroke-linejoin="round"/>',
  长期计划: '<path d="M4 22V3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 4h11l-2 4 2 4H4" stroke-linecap="round" stroke-linejoin="round"/>',
  秋招: '<path d="M20 7h-3V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 13h4" stroke-linecap="round"/>',
  读书: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke-linecap="round" stroke-linejoin="round"/>',
  减肥: '<rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 15a4 4 0 0 1 8 0" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 15l2.5-3" stroke-linecap="round" stroke-linejoin="round"/>',
  创意: '<path d="M9.66 17.67A3 3 0 0 1 12 15a3 3 0 0 1 2.34 2.67 3 3 0 0 0 3.16 2.33 3 3 0 0 0 3-3V12a10 10 0 0 0-5-8.66A10 10 0 0 0 4 5a10 10 0 0 0-4 7v.5" stroke-linecap="round" stroke-linejoin="round"/>',
  日记: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8h-4M14 12h-4" stroke-linecap="round"/>',
  成长: '<path d="M12 20V10M18 20V4M6 20v-4" stroke-linecap="round" stroke-linejoin="round"/>',
  理财: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-linecap="round" stroke-linejoin="round"/>',
};

/*
 * 侧边栏：待办置顶；秋招不再是固定六个页面，改成 note_folder 里的两级文章目录（见 stores/notes.js）。
 * 读书、生活已收进「长期计划」：那里的卡片负责周期和概览，点进去才是明细，
 * 所以不再单列一级菜单（避免同一个功能在侧栏出现两处入口）。
 */
export const NAV_GROUPS = [
  { name: "待办", children: ["日常待办", "长期计划"] },
  { name: "秋招", children: [], notes: true },
  { name: "创意", children: ["灵感笔记", "手绘画布", "手工档案"] },
  { name: "日记", children: [] },
  { name: "成长", children: ["成长日志", "积分兑换"] },
  { name: "理财", children: [], future: true },
];

/* 新增文章时可选的分类，下拉里还能手动输入自定义分类 */
export const NOTE_CATEGORIES = ["生活", "日记", "工作", "秋招"];

export const PRI_COLOR = { 高: "#d4a5a5", 中: "#a8c5b8", 低: "#e8d4b8" };
export const PALETTE = ["#d4a5a5", "#a8c5b8", "#e8d4b8", "#b9b08a"];

/* 新建任务时可直接点选的常用标签（后面按标签筛选/统计用时都用它） */
export const PRESET_TAGS = ["个人学习", "算法", "八股", "模拟面试", "面试", "秋招", "读书", "生活", "日常"];
