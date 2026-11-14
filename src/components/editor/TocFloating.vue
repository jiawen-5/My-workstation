<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

/*
 * 右下角可拖拽悬浮球 + 悬浮大纲弹窗。
 * 大纲数据来自 RichTextEditor 的 TableOfContents 扩展，这里只负责摆放和交互。
 */
const props = defineProps({
  items: { type: Array, default: () => [] },
  activeId: { type: String, default: "" },
  dark: Boolean,
  anchor: { type: Object, default: null }, // 内容区元素，用来算「内容区右下角」的默认位置
});
const emit = defineEmits(["jump"]);

const POS_KEY = "workbench.editor.ball.v1";
const BALL = 42;
const MARGIN = 12;

const ball = ref(null);
const open = ref(false);
const dragging = ref(false);
const vw = ref(typeof window === "undefined" ? 1280 : window.innerWidth);
const vh = ref(typeof window === "undefined" ? 800 : window.innerHeight);
const pos = ref({ x: 0, y: 0 });

function clampPoint(p) {
  return {
    x: Math.min(Math.max(MARGIN, p.x), vw.value - BALL - MARGIN),
    y: Math.min(Math.max(MARGIN, p.y), vh.value - BALL - MARGIN),
  };
}

function readPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch {
    /* 忽略损坏的记录 */
  }
  return null;
}

function savePos(p) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    /* 忽略配额错误 */
  }
}

/* 没拖过就贴着内容区右下角，拖过就沿用它最后的位置 */
function defaultPos() {
  const rect = props.anchor?.getBoundingClientRect?.();
  const right = rect ? rect.right : vw.value;
  const bottom = rect ? rect.bottom : vh.value;
  return clampPoint({ x: right - BALL - 18, y: bottom - BALL - 24 });
}

/*
 * 弹窗永远贴着小球：底部距离小球上沿 20px，高度跟着内容走。
 * 提纲太长时用 CSS 的 max-height 卡住，列表自己出滚动条（.toc-list overflow-y）。
 * 上方实在放不下（小球被拖到顶部）才翻到小球下面。
 */
const popStyle = computed(() => {
  const width = Math.min(268, vw.value - 2 * MARGIN);
  let left = pos.value.x + BALL / 2 - width / 2;
  left = Math.min(Math.max(MARGIN, left), vw.value - width - MARGIN);

  const gap = 20;
  const above = pos.value.y - gap - MARGIN; // 小球上方可用高度
  const below = vh.value - (pos.value.y + BALL + gap) - MARGIN; // 小球下方可用高度

  if (above >= 120 || above >= below) {
    return {
      left: `${left}px`,
      bottom: `${Math.max(MARGIN, vh.value - pos.value.y + gap)}px`,
      width: `${width}px`,
      maxHeight: `${Math.max(120, above)}px`,
    };
  }
  const top = pos.value.y + BALL + gap;
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(120, below)}px`,
  };
});

let drag = null;
function onDown(e) {
  drag = { sx: e.clientX, sy: e.clientY, bx: pos.value.x, by: pos.value.y, moved: false };
  dragging.value = true;
  try {
    ball.value?.setPointerCapture?.(e.pointerId);
  } catch {
    /* 合成事件没有真实 pointerId 时忽略 */
  }
}
function onMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.sx;
  const dy = e.clientY - drag.sy;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
  if (drag.moved) pos.value = clampPoint({ x: drag.bx + dx, y: drag.by + dy });
}
function onUp() {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  dragging.value = false;
  if (moved) {
    savePos(pos.value);
    return;
  }
  open.value = !open.value;
}

function pick(item) {
  emit("jump", item);
  open.value = false;
}

function onOutside(e) {
  if (!open.value) return;
  if (e.target?.closest?.(".toc-pop, .toc-ball")) return;
  open.value = false;
}

function onResize() {
  vw.value = window.innerWidth;
  vh.value = window.innerHeight;
  pos.value = clampPoint(pos.value);
}

onMounted(() => {
  vw.value = window.innerWidth;
  vh.value = window.innerHeight;
  pos.value = clampPoint(readPos() || defaultPos());
  window.addEventListener("resize", onResize);
  document.addEventListener("pointerdown", onOutside, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  document.removeEventListener("pointerdown", onOutside, true);
});
</script>

<template>
  <button
    ref="ball"
    type="button"
    class="toc-ball"
    :class="{ dragging, open }"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${BALL}px`, height: `${BALL}px` }"
    :title="open ? '收起大纲' : '打开大纲（可拖动）'"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
      <path d="M4 6h16M4 12h10M4 18h13" />
    </svg>
    <span v-if="items.length" class="toc-badge">{{ items.length }}</span>
  </button>

  <div v-if="open" class="toc-pop" :style="popStyle" @pointerdown.stop>
    <div class="toc-head">
      <span>大纲</span>
      <span class="toc-count">{{ items.length }} 个标题</span>
    </div>
    <div v-if="!items.length" class="toc-empty">还没有标题，选中文字后点 H1 / H2 / H3 就会出现在这里</div>
    <div v-else class="toc-list">
      <button
        v-for="it in items"
        :key="it.id"
        type="button"
        class="toc-item"
        :class="{ on: it.id === activeId, [`lv${it.level}`]: true }"
        :style="{ paddingLeft: `${8 + (it.level - 1) * 12}px` }"
        @click="pick(it)"
      >{{ it.text }}</button>
    </div>
  </div>
</template>

<style scoped>
.toc-ball {
  position: fixed;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--rte-border);
  border-radius: 50%;
  background: var(--rte-panel);
  color: var(--rte-fg);
  box-shadow: 0 4px 14px rgba(61, 74, 92, 0.16);
  backdrop-filter: blur(8px);
  cursor: grab;
  touch-action: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.toc-ball:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(61, 74, 92, 0.22);
}

.toc-ball.open {
  border-color: var(--rte-accent);
  color: var(--rte-accent);
}

.toc-ball.dragging {
  cursor: grabbing;
  transform: scale(1.04);
}

.toc-ball svg {
  width: 16px;
  height: 16px;
}

.toc-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--rte-accent);
  color: #fff;
  font-size: 9px;
  line-height: 15px;
  text-align: center;
}

.toc-pop {
  position: fixed;
  z-index: 41;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--rte-border);
  border-radius: 16px;
  background: var(--rte-panel);
  box-shadow: 0 10px 30px rgba(61, 74, 92, 0.18);
  backdrop-filter: blur(12px);
}

.toc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--rte-border);
  font-size: 11px;
  color: var(--rte-fg);
}

.toc-count {
  font-size: 9px;
  opacity: 0.45;
}

/* 标题多了就在弹窗内部滚，弹窗本身贴着小球不动 */
.toc-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
}

.toc-list::-webkit-scrollbar {
  width: 5px;
}

.toc-list::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: var(--rte-border);
}

.toc-list::-webkit-scrollbar-thumb:hover {
  background: var(--rte-muted);
}

.toc-list::-webkit-scrollbar-track {
  background: transparent;
}

.toc-item {
  display: block;
  width: 100%;
  padding: 5px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--rte-muted);
  font-size: 11px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.16s ease, color 0.16s ease;
}

.toc-item:hover {
  background: var(--rte-hover);
  color: var(--rte-fg);
}

.toc-item.lv2 {
  font-size: 10.5px;
}

.toc-item.lv3 {
  font-size: 10px;
  opacity: 0.9;
}

.toc-item.on {
  background: var(--rte-accent-soft);
  color: var(--rte-fg);
  font-weight: 500;
}

.toc-empty {
  padding: 14px 12px 18px;
  font-size: 10.5px;
  line-height: 1.7;
  color: var(--rte-muted);
}
</style>
