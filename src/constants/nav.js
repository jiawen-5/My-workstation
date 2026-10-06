export const ICONS = {
  待办: '<path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-linecap="round" stroke-linejoin="round"/>',
  秋招: '<path d="M20 7h-3V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 13h4" stroke-linecap="round"/>',
  读书: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke-linecap="round" stroke-linejoin="round"/>',
  生活: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke-linecap="round" stroke-linejoin="round"/>',
  创意: '<path d="M9.66 17.67A3 3 0 0 1 12 15a3 3 0 0 1 2.34 2.67 3 3 0 0 0 3.16 2.33 3 3 0 0 0 3-3V12a10 10 0 0 0-5-8.66A10 10 0 0 0 4 5a10 10 0 0 0-4 7v.5" stroke-linecap="round" stroke-linejoin="round"/>',
  日记: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8h-4M14 12h-4" stroke-linecap="round"/>',
  理财: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-linecap="round" stroke-linejoin="round"/>',
};

/* 侧边栏：待办置顶 */
export const NAV_GROUPS = [
  { name: "待办", children: ["日常待办", "长期计划"] },
  { name: "秋招", children: ["八股笔记", "算法题库", "投递记录", "项目档案", "简历库", "模拟面试"] },
  { name: "读书", children: [] },
  { name: "生活", children: ["三餐饮食", "运动打卡", "身体数据"] },
  { name: "创意", children: ["灵感笔记", "手绘画布", "手工档案"] },
  { name: "日记", children: [] },
  { name: "理财", children: [], future: true },
];

export const PRI_COLOR = { 高: "#d4a5a5", 中: "#a8c5b8", 低: "#e8d4b8" };
export const PALETTE = ["#d4a5a5", "#a8c5b8", "#e8d4b8", "#b9b08a"];
