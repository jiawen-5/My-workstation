<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import * as echarts from "echarts";
import { STAMP_KINDS } from "../../constants/rewards.js";
import { addDays, bjDateKey } from "../../composables/useDay.js";
import DateField from "../DateField.vue";

const props = defineProps({ dark: Boolean, open: Boolean, records: { type: Array, default: () => [] }, points: { type: Number, default: 0 } });
const emit = defineEmits(["close"]);

const fStart = ref("");
const fEnd = ref("");
const flow = ref("all"); // all | in | out

const filtered = computed(() => props.records.filter((r) => {
  const day = (r.at || "").slice(0, 10);
  if (fStart.value && day < fStart.value) return false;
  if (fEnd.value && day > fEnd.value) return false;
  if (flow.value === "in" && r.points <= 0) return false;
  if (flow.value === "out" && r.points >= 0) return false;
  return true;
}));

const totals = computed(() => {
  const gained = filtered.value.reduce((n, r) => n + Math.max(0, r.points), 0);
  const spent = filtered.value.reduce((n, r) => n + Math.max(0, -r.points), 0);
  return { gained, spent, net: gained - spent, count: filtered.value.length };
});

const groups = computed(() => {
  const map = new Map();
  for (const r of filtered.value) {
    const d = (r.at || "").slice(0, 10) || "未知日期";
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(r);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      list: [...list].sort((a, b) => (b.at || "").localeCompare(a.at || "") || b.id - a.id),
      net: list.reduce((n, r) => n + r.points, 0),
    }));
});

const today = bjDateKey();
const ranges = [
  { key: "week", label: "近 7 天", from: () => addDays(today, -6), to: () => today },
  { key: "days30", label: "近 30 天", from: () => addDays(today, -29), to: () => today },
  { key: "month", label: "本月", from: () => `${today.slice(0, 8)}01`, to: () => today },
  { key: "all", label: "全部", from: () => "", to: () => "" },
];
function applyRange(r) {
  fStart.value = r.from();
  fEnd.value = r.to();
}
const activeRange = computed(() => {
  const hit = ranges.find((r) => r.from() === fStart.value && r.to() === fEnd.value);
  return hit ? hit.key : "custom";
});

/* ---- 图表：近 14 个有流水的日子做加减柱状，来源占比看获取结构 ---- */
const daily = computed(() => {
  const map = new Map();
  for (const r of filtered.value) {
    const d = (r.at || "").slice(0, 10);
    if (!d) continue;
    const slot = map.get(d) || { in: 0, out: 0 };
    if (r.points >= 0) slot.in += r.points;
    else slot.out += -r.points;
    map.set(d, slot);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
});

const sources = computed(() => {
  const map = {};
  for (const r of filtered.value) {
    if (r.points <= 0) continue;
    const label = STAMP_KINDS[r.kind]?.label || "其他";
    map[label] = (map[label] || 0) + r.points;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
});
const hasSources = computed(() => sources.value.length > 0);

const barEl = ref(null);
const pieEl = ref(null);
let bar = null;
let pie = null;

function render() {
  if (!props.open) return;
  nextTick(() => {
    const text = props.dark ? "rgba(236,232,225,.85)" : "rgba(61,74,92,.85)";
    const line = props.dark ? "rgba(255,255,255,.08)" : "rgba(61,74,92,.1)";
    bar?.dispose();
    pie?.dispose();
    bar = null;
    pie = null;

    if (barEl.value) {
      bar = echarts.init(barEl.value);
      bar.setOption({
        grid: { left: 34, right: 10, top: 26, bottom: 22 },
        tooltip: { trigger: "axis" },
        legend: { data: ["获取", "兑换"], textStyle: { color: text, fontSize: 10 }, top: 0, itemWidth: 8, itemHeight: 8 },
        xAxis: {
          type: "category",
          data: daily.value.map(([d]) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`),
          axisLine: { lineStyle: { color: line } },
          axisTick: { show: false },
          axisLabel: { color: text, fontSize: 10 },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: text, fontSize: 10 },
          splitLine: { lineStyle: { color: line } },
        },
        series: [
          { name: "获取", type: "bar", data: daily.value.map(([, v]) => v.in), barMaxWidth: 12, itemStyle: { color: "#a8c5b8", borderRadius: [4, 4, 0, 0] } },
          { name: "兑换", type: "bar", data: daily.value.map(([, v]) => v.out), barMaxWidth: 12, itemStyle: { color: "#d4a5a5", borderRadius: [4, 4, 0, 0] } },
        ],
      });
    }

    if (pieEl.value && hasSources.value) {
      pie = echarts.init(pieEl.value);
      pie.setOption({
        tooltip: { trigger: "item", formatter: "{b}：{c} 分（{d}%）" },
        legend: { bottom: 0, textStyle: { color: text, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
        color: ["#a8c5b8", "#d4a5a5", "#b9b08a", "#e8d4b8"],
        series: [{ type: "pie", radius: ["42%", "62%"], center: ["50%", "44%"], data: sources.value, label: { show: false } }],
      });
    }
  });
}

watch([() => props.open, fStart, fEnd, flow], render);
watch(() => props.records, render, { deep: true });

function onResize() {
  bar?.resize();
  pie?.resize();
}
watch(() => props.open, (v) => {
  if (v) window.addEventListener("resize", onResize);
  else window.removeEventListener("resize", onResize);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  bar?.dispose();
  pie?.dispose();
});

const dayLabel = (key) => {
  if (key.length !== 10) return key;
  const [, m, d] = key.split("-");
  return `${Number(m)} 月 ${Number(d)} 日`;
};
const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61,74,92,0.25)">
    <div class="w-full max-w-2xl rounded-2xl border shadow-sm p-6 max-h-[92vh] overflow-y-auto" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">积分历史记录</h3>
          <p class="text-[10px] opacity-50 mt-1">当前 {{ points }} 积分 · 共 {{ records.length }} 条流水</p>
        </div>
        <button @click="emit('close')" class="w-7 h-7 shrink-0 flex items-center justify-center rounded-full border text-xs opacity-60 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">✕</button>
      </div>

      <div class="flex flex-wrap gap-1.5 mb-2">
        <button v-for="r in ranges" :key="r.key" @click="applyRange(r)" class="rounded-xl border text-[10px] px-2.5 py-1.5 transition-all duration-300 active:scale-[0.98]"
          :class="activeRange === r.key ? (dark ? 'bg-white/10 border-transparent' : 'bg-[#3d4a5c]/10 border-transparent') : (dark ? 'border-white/12 opacity-55' : 'border-[#3d4a5c]/15 opacity-55')">{{ r.label }}</button>
        <span class="flex-1"></span>
        <button v-for="f in [{ k: 'all', t: '全部流水' }, { k: 'in', t: '只看加分' }, { k: 'out', t: '只看兑换' }]" :key="f.k" @click="flow = f.k" class="rounded-xl border text-[10px] px-2.5 py-1.5 transition-all duration-300 active:scale-[0.98]"
          :class="flow === f.k ? (dark ? 'bg-white/10 border-transparent' : 'bg-[#a8c5b8]/20 border-transparent') : (dark ? 'border-white/12 opacity-55' : 'border-[#3d4a5c]/15 opacity-55')">{{ f.t }}</button>
      </div>

      <div class="grid grid-cols-2 gap-2 mb-2">
        <DateField v-model="fStart" :dark="dark" clearable placeholder="开始日期" />
        <DateField v-model="fEnd" :dark="dark" clearable placeholder="结束日期" />
      </div>

      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="rounded-2xl border px-3 py-2" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
          <p class="text-[10px] opacity-45">筛选区间获取</p>
          <p class="text-sm text-[#a8c5b8]">+{{ totals.gained }}</p>
        </div>
        <div class="rounded-2xl border px-3 py-2" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
          <p class="text-[10px] opacity-45">筛选区间兑换</p>
          <p class="text-sm text-[#d4a5a5]">-{{ totals.spent }}</p>
        </div>
        <div class="rounded-2xl border px-3 py-2" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
          <p class="text-[10px] opacity-45">净变化</p>
          <p class="text-sm" :class="totals.net >= 0 ? '' : 'text-[#d4a5a5]'">{{ sign(totals.net) }}</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-3 mb-4">
        <div class="rounded-2xl border p-2" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/12'">
          <p class="text-[10px] opacity-50 pl-1.5 pt-1">每日加减流水（近 14 天）</p>
          <div ref="barEl" style="height: 180px"></div>
        </div>
        <div class="rounded-2xl border p-2" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/12'">
          <p class="text-[10px] opacity-50 pl-1.5 pt-1">积分来源占比</p>
          <div v-if="hasSources" ref="pieEl" style="height: 180px"></div>
          <div v-else class="h-[180px] flex items-center justify-center text-[11px] opacity-35">当前筛选下没有加分流</div>
        </div>
      </div>

      <div class="max-h-[32vh] overflow-y-auto pr-0.5">
        <p v-if="!groups.length" class="text-[11px] opacity-40 rounded-xl border border-dashed py-8 text-center" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'">这个区间没有流水，调整日期或筛选看看</p>
        <div v-for="g in groups" :key="g.date">
          <div class="flex items-center gap-2 px-1 pt-2 pb-1.5">
            <span class="text-[10px] opacity-45">{{ dayLabel(g.date) }}</span>
            <span class="flex-1 h-px" :class="dark ? 'bg-white/8' : 'bg-[#3d4a5c]/8'"></span>
            <span class="text-[10px]" :class="g.net >= 0 ? 'opacity-45' : 'text-[#d4a5a5]'">{{ sign(g.net) }}</span>
          </div>
          <div v-for="r in g.list" :key="r.id" class="flex items-center gap-2 rounded-xl px-2 py-1.5 mb-0.5" :class="dark ? 'hover:bg-white/5' : 'hover:bg-[#3d4a5c]/[0.04]'">
            <span class="w-5 h-5 shrink-0 rounded-lg flex items-center justify-center text-[10px]" :style="{ background: (STAMP_KINDS[r.kind]?.color || '#a8c5b8') + '2e' }">{{ STAMP_KINDS[r.kind]?.icon || '·' }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] truncate">{{ r.title }}</p>
              <p class="text-[10px] opacity-40 truncate">
                {{ STAMP_KINDS[r.kind]?.label || '记录' }}<span v-if="r.note"> · {{ r.note }}</span>
              </p>
            </div>
            <span class="text-[10px] opacity-35 shrink-0">{{ (r.at || '').slice(11) }}</span>
            <span class="text-[11px] w-9 text-right shrink-0" :class="r.points >= 0 ? '' : 'text-[#d4a5a5]'">{{ sign(r.points) }}</span>
          </div>
        </div>
      </div>

      <button @click="emit('close')" class="w-full mt-3 rounded-2xl border text-xs py-2.5 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">关闭</button>
    </div>
  </div>
</template>