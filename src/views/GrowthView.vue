<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";
import { JOURNAL_EVENTS, EVENT_COLOR } from "../constants/journal.js";
import { useJournal } from "../stores/journal.js";

defineProps({ dark: Boolean, title: String, dateLine: String });
const emit = defineEmits(["open-create", "open-edit"]);

const j = useJournal();
onMounted(() => j.load());

const fEvent = ref("");
const fCat = ref("");
const fMood = ref("");
const fStart = ref("");
const fEnd = ref("");
const showStats = ref(false);
const statsMode = ref("month"); // month | year

const filtered = computed(() => j.sorted.value.filter((l) => {
  if (fEvent.value && l.event !== fEvent.value) return false;
  if (fCat.value && l.category !== fCat.value) return false;
  if (fMood.value && l.mood !== fMood.value) return false;
  const day = (l.createdAt || "").slice(0, 10);
  if (fStart.value && day < fStart.value) return false;
  if (fEnd.value && day > fEnd.value) return false;
  return true;
}));

function clearFilter() {
  fEvent.value = ""; fCat.value = ""; fMood.value = ""; fStart.value = ""; fEnd.value = "";
}

const editing = ref(null);
function openCreate() { emit("open-create"); }
function openEdit(l) { emit("open-edit", l); }

/* 卡片正文最多显示三行：实测是否溢出三行，只有真正超出的卡片才显示展开/收起 */
const expandedIds = ref(new Set());
const overflowIds = ref(new Set());
const bodyEls = new Map();
function isExpanded(l) { return expandedIds.value.has(l.id); }
function toggleExpand(l) {
  const s = new Set(expandedIds.value);
  s.has(l.id) ? s.delete(l.id) : s.add(l.id);
  expandedIds.value = s;
}
function setBodyEl(l, el) {
  if (el) bodyEls.set(l.id, el);
  else bodyEls.delete(l.id);
}
function checkOverflow() {
  const s = new Set();
  for (const [id, el] of bodyEls) {
    const had = el.classList.contains("line-clamp-3");
    el.classList.add("line-clamp-3");
    const overflow = el.scrollHeight > el.clientHeight + 2;
    if (!had) el.classList.remove("line-clamp-3");
    if (overflow) s.add(id);
  }
  overflowIds.value = s;
}
watch(filtered, () => nextTick(checkOverflow));
onMounted(() => nextTick(checkOverflow));

/* ---- 统计：基于当前筛选结果，按月/年聚合 ---- */
const statScope = computed(() => {
  const keyOf = (l) => (statsMode.value === "month" ? (l.createdAt || "").slice(0, 7) : (l.createdAt || "").slice(0, 4));
  const keys = [...new Set(filtered.value.map(keyOf).filter(Boolean))].sort().slice(-12);
  const evSeries = JOURNAL_EVENTS.map((e) => ({ name: e, data: keys.map((k) => filtered.value.filter((l) => keyOf(l) === k && l.event === e).length) }));
  const catMap = {};
  const moodMap = {};
  for (const l of filtered.value) {
    catMap[l.category || "未分类"] = (catMap[l.category || "未分类"] || 0) + 1;
    moodMap[l.mood || "无情绪"] = (moodMap[l.mood || "无情绪"] || 0) + 1;
  }
  return { keys, evSeries, cats: Object.entries(catMap).map(([name, value]) => ({ name, value })), moods: Object.entries(moodMap).map(([name, value]) => ({ name, value })) };
});

let c1 = null, c2 = null, c3 = null;
const el1 = ref(null), el2 = ref(null), el3 = ref(null);
function renderCharts() {
  if (!showStats.value) return;
  nextTick(() => {
    const dark = document.body.classList.contains("dark");
    const text = dark ? "#ece8e1" : "#3d4a5c";
    const base = { textStyle: { color: text, fontSize: 11 }, tooltip: { trigger: "axis" }, grid: { left: 36, right: 12, top: 28, bottom: 24 } };
    c1?.dispose(); c2?.dispose(); c3?.dispose();
    const s = statScope.value;
    c1 = echarts.init(el1.value);
    c1.setOption({ ...base, legend: { data: JOURNAL_EVENTS, textStyle: { color: text, fontSize: 10 }, top: 0 }, xAxis: { type: "category", data: s.keys }, yAxis: { type: "value", minInterval: 1 },
      series: s.evSeries.map((x) => ({ ...x, type: "line", smooth: true, itemStyle: { color: EVENT_COLOR[x.name] } })) });
    c2 = echarts.init(el2.value);
    c2.setOption({ tooltip: { trigger: "item" }, legend: { textStyle: { color: text, fontSize: 10 }, bottom: 0 }, series: [{ type: "pie", radius: "62%", data: s.cats }] });
    c3 = echarts.init(el3.value);
    c3.setOption({ ...base, tooltip: { trigger: "axis" }, xAxis: { type: "category", data: s.moods.map((x) => x.name) }, yAxis: { type: "value", minInterval: 1 },
      series: [{ type: "bar", data: s.moods.map((x) => x.value), itemStyle: { color: "#a8c5b8", borderRadius: [8, 8, 0, 0] } }] });
  });
}
watch([showStats, statsMode, filtered], renderCharts);

const fmtDate = (s) => s ? s.replaceAll("-", ".") : "";
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-10">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
        <p class="text-xs md:text-sm opacity-60 mt-1">{{ dateLine }}</p>
      </div>
      <div class="flex gap-2">
        <button @click="showStats = !showStats; renderCharts()" class="rounded-2xl border px-4 py-2 text-xs transition-all duration-300 active:scale-[0.98] opacity-80 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">{{ showStats ? "收起统计" : "统计面板" }}</button>
        <button @click="openCreate" class="rounded-2xl shadow-sm px-4 py-2 text-xs transition-all duration-300 active:scale-[0.98]" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">＋ 新增日志</button>
      </div>
    </div>

    <!-- 筛选条 -->
    <div class="rounded-2xl border p-4 mb-6" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
      <div class="flex flex-wrap gap-2 mb-3">
        <button @click="fEvent = ''" class="rounded-2xl border text-[11px] px-3 py-1.5" :class="!fEvent ? (dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10') : 'opacity-60'" :style="{ borderColor: dark ? 'rgba(255,255,255,.1)' : 'rgba(61,74,92,.15)' }">全部事件</button>
        <button v-for="e in JOURNAL_EVENTS" :key="e" @click="fEvent = fEvent === e ? '' : e"
          class="rounded-2xl border text-[11px] px-3 py-1.5 transition-all" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
          :style="fEvent === e ? { background: EVENT_COLOR[e] + '26', borderColor: EVENT_COLOR[e] + '66' } : { opacity: 0.75 }">{{ e }}</button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
        <select v-model="fCat" class="rounded-xl border text-[11px] px-2.5 py-2 bg-transparent focus:outline-none" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">
          <option value="">全部分类</option><option v-for="c in j.categories.value" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="fMood" class="rounded-xl border text-[11px] px-2.5 py-2 bg-transparent focus:outline-none" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">
          <option value="">全部情绪</option><option v-for="m in j.moods.value" :key="m" :value="m">{{ m }}</option>
        </select>
        <input v-model="fStart" type="date" class="rounded-xl border text-[11px] px-2.5 py-2 bg-transparent focus:outline-none" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'" :style="dark ? 'color-scheme: dark' : ''" />
        <input v-model="fEnd" type="date" class="rounded-xl border text-[11px] px-2.5 py-2 bg-transparent focus:outline-none" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'" :style="dark ? 'color-scheme: dark' : ''" />
        <button @click="clearFilter" class="rounded-xl border text-[11px] px-2.5 py-2 opacity-60 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">清空筛选</button>
      </div>
      <p v-if="fStart || fEnd" class="text-[10px] opacity-50 mt-2 pl-1">时间段：{{ fmtDate(fStart) || "不限" }} — {{ fmtDate(fEnd) || "不限" }}（如 2026.9.1 - 2026.9.30）</p>
    </div>

    <!-- 统计面板 -->
    <div v-if="showStats" class="rounded-2xl border p-4 mb-6" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs opacity-70">共 {{ filtered.length }} 条（随筛选变化）</p>
        <div class="flex gap-1.5">
          <button @click="statsMode = 'month'" class="rounded-xl text-[11px] px-3 py-1.5 border" :class="statsMode === 'month' ? (dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10') : 'opacity-60'" :style="{ borderColor: dark ? 'rgba(255,255,255,.1)' : 'rgba(61,74,92,.15)' }">按月</button>
          <button @click="statsMode = 'year'" class="rounded-xl text-[11px] px-3 py-1.5 border" :class="statsMode === 'year' ? (dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10') : 'opacity-60'" :style="{ borderColor: dark ? 'rgba(255,255,255,.1)' : 'rgba(61,74,92,.15)' }">按年</button>
        </div>
      </div>
      <p class="text-[11px] opacity-60 mt-2 mb-1 pl-1">各事件数量趋势</p>
      <div ref="el1" style="height: 240px"></div>
      <div class="grid md:grid-cols-2 gap-3 mt-2">
        <div><p class="text-[11px] opacity-60 mb-1 pl-1">细分类型占比</p><div ref="el2" style="height: 240px"></div></div>
        <div><p class="text-[11px] opacity-60 mb-1 pl-1">情绪分布统计</p><div ref="el3" style="height: 240px"></div></div>
      </div>
    </div>

    <!-- 时间轴：最新在上 -->
    <div v-if="!filtered.length" class="text-xs opacity-50 rounded-2xl border border-dashed p-8 text-center" :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/20'">
      暂无日志，点击右上新增第一条成长记录
    </div>
    <div v-for="l in filtered" :key="l.id" class="flex items-start gap-3 mb-4 group">
      <div class="flex flex-col items-center self-stretch">
        <div class="w-2.5 h-2.5 rounded-full border-2 mt-1.5" :style="{ background: EVENT_COLOR[l.event] || '#a8c5b8', borderColor: dark ? '#2e3440' : '#faf9f7' }"></div>
        <div class="w-px flex-1 min-h-[1rem]" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/12'"></div>
      </div>
      <div class="flex-1 rounded-2xl border shadow-sm p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.08)]" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/12'" @click="openEdit(l)">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[10px] rounded-full px-2.5 py-0.5 border" :style="{ background: (EVENT_COLOR[l.event] || '#a8c5b8') + '22', borderColor: (EVENT_COLOR[l.event] || '#a8c5b8') + '55' }">{{ l.event }}</span>
          <span v-if="l.category" class="text-[10px] opacity-60"># {{ l.category }}</span>
          <span v-if="l.mood" class="text-[10px] opacity-60">· {{ l.mood }}</span>
          <span class="text-[10px] opacity-40 ml-auto">{{ l.createdAt }}</span>
        </div>
        <p :ref="(el) => setBodyEl(l, el)" class="text-xs mt-2 leading-6 whitespace-pre-wrap opacity-90" :class="{ 'line-clamp-3': !isExpanded(l) }">{{ l.content }}</p>
        <button v-if="overflowIds.has(l.id) || isExpanded(l)" @click.stop="toggleExpand(l)" class="text-[11px] mt-1 opacity-60 hover:opacity-100">{{ isExpanded(l) ? "收起 ▲" : "展开 ▼" }}</button>
      </div>
    </div>
    <div class="pb-10"></div>
  </div>
</template>
