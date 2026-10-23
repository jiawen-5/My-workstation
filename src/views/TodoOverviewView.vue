<script setup>
import { computed, ref, watch } from "vue";
import { useWorkbench } from "../stores/workbench.js";
import { dateToKey, keyLabel, keyShortLabel, relativeLabel } from "../composables/useDay.js";

const props = defineProps({ dark: Boolean, title: String });
const emit = defineEmits(["select", "open-create"]);

const wb = useWorkbench();
const WEEK = ["一", "二", "三", "四", "五", "六", "日"];
const PER_CELL = 3;

const today = wb.today;
const selectedDate = wb.selectedDate;

/* 月历游标：切年切月只动它，不会改变已选中的日期 */
const cursor = ref({ y: +selectedDate.value.slice(0, 4), m: +selectedDate.value.slice(5, 7) });

const yearOptions = computed(() => {
  const base = +today.value.slice(0, 4);
  const set = new Set();
  for (let y = base - 8; y <= base + 8; y++) set.add(y);
  set.add(cursor.value.y);
  return [...set].sort((a, b) => a - b);
});

const monthTitle = computed(() => `${cursor.value.y} 年 ${cursor.value.m} 月`);
const selectedHint = computed(() => relativeLabel(selectedDate.value, today.value));

const cells = computed(() => {
  const { y, m } = cursor.value;
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7; // 星期一排第一列
  const daysInMonth = new Date(y, m, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const gridStart = new Date(y, m - 1, 1 - offset);
  const out = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = dateToKey(d);
    const list = wb.tasksOn(key);
    out.push({
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === m - 1,
      isToday: key === today.value,
      isSelected: key === selectedDate.value,
      tasks: list,
      doneCount: list.filter((t) => t.status === "done").length,
    });
  }
  return out;
});

const monthStat = computed(() => {
  const inMonth = cells.value.filter((c) => c.inMonth);
  const total = inMonth.reduce((n, c) => n + c.tasks.length, 0);
  const done = inMonth.reduce((n, c) => n + c.doneCount, 0);
  const days = inMonth.filter((c) => c.tasks.length).length;
  return { total, done, days };
});

function shiftMonth(n) {
  const idx = cursor.value.m - 1 + n;
  cursor.value = {
    y: cursor.value.y + Math.floor(idx / 12),
    m: (((idx % 12) + 12) % 12) + 1,
  };
}

function goToday() {
  cursor.value = { y: +today.value.slice(0, 4), m: +today.value.slice(5, 7) };
  wb.setDate(today.value);
}

function pick(cell) {
  if (!cell.inMonth) cursor.value = { y: +cell.key.slice(0, 4), m: +cell.key.slice(5, 7) };
  wb.setDate(cell.key);
  emit("select", cell.key);
}

/* 在总览里新建完任务，把月历翻到任务所属那个月，让新任务立刻可见 */
watch(
  () => wb.tasks.value.length,
  (n, old) => {
    if (n <= old) return;
    const k = wb.selectedDate.value;
    cursor.value = { y: +k.slice(0, 4), m: +k.slice(5, 7) };
  },
);

function cellClass(c) {
  if (c.isSelected) {
    return props.dark
      ? "bg-[#a8c5b8]/18 border-[#a8c5b8]/45"
      : "bg-[#a8c5b8]/14 border-[#a8c5b8]/45";
  }
  return props.dark
    ? "bg-white/5 border-white/10 hover:bg-white/10"
    : "border-[#3d4a5c]/12 hover:bg-[#3d4a5c]/5";
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-10">
    <div class="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }} · 总览</h1>
        <p class="text-xs md:text-sm opacity-60 mt-1">
          按北京时间计日 · 选中 {{ keyLabel(selectedDate) }}（{{ selectedHint }}）
        </p>
      </div>
      <div class="shrink-0 text-right">
        <button
          @click="emit('open-create')"
          class="flex items-center gap-2 rounded-2xl shadow-sm px-4 py-2 text-xs md:text-sm transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
        >
          ＋ 新建待办
        </button>
        <p class="text-[10px] opacity-45 mt-1.5">归属 {{ keyShortLabel(selectedDate) }} · {{ selectedHint }}</p>
      </div>
    </div>

    <div class="rounded-2xl border p-3 md:p-4" :class="dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#3d4a5c]/12'">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-1.5">
          <button
            @click="shiftMonth(-1)"
            title="上一月"
            class="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-xl border transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'border-white/12 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <select
            v-model.number="cursor.y"
            class="h-7 rounded-xl border text-[11px] pl-2 pr-6 bg-transparent focus:outline-none"
            :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
          </select>
          <select
            v-model.number="cursor.m"
            class="h-7 rounded-xl border text-[11px] pl-2 pr-6 bg-transparent focus:outline-none"
            :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
          >
            <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
          </select>
          <button
            @click="shiftMonth(1)"
            title="下一月"
            class="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-xl border transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'border-white/12 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <button
            @click="goToday"
            class="h-7 inline-flex items-center rounded-xl border text-[11px] px-2.5 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
          >今天</button>
          <span class="text-[11px] opacity-45 ml-1 hidden md:inline">{{ monthTitle }}</span>
        </div>
        <p class="text-[10px] opacity-50">
          本月 {{ monthStat.total }} 条待办 · 已完成 {{ monthStat.done }} · 有安排 {{ monthStat.days }} 天
        </p>
      </div>

      <div class="grid grid-cols-7 gap-1.5 md:gap-2 mb-1.5">
        <div v-for="w in WEEK" :key="w" class="text-center text-[10px] opacity-45 py-1">{{ w }}</div>
      </div>

      <div class="grid grid-cols-7 gap-1.5 md:gap-2">
        <button
          v-for="c in cells"
          :key="c.key"
          @click="pick(c)"
          class="text-left rounded-2xl border p-1.5 md:p-2 min-h-[92px] md:min-h-[104px] flex flex-col gap-1 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)] active:scale-[0.99]"
          :class="[cellClass(c), c.inMonth ? '' : 'opacity-40']"
        >
          <div class="flex items-center justify-between leading-none">
            <span
              class="text-[11px] w-5 h-5 flex items-center justify-center rounded-full shrink-0"
              :class="c.isToday ? 'bg-[#d4a5a5] text-white' : ''"
            >{{ c.day }}</span>
            <span v-if="c.tasks.length && c.doneCount === c.tasks.length" class="text-[9px] text-[#a8c5b8]">✓</span>
            <span v-else-if="c.tasks.length" class="text-[9px] opacity-40">{{ c.tasks.length }}</span>
          </div>

          <div class="flex flex-col gap-0.5 min-w-0">
            <div v-for="t in c.tasks.slice(0, PER_CELL)" :key="t.id" class="flex items-center gap-1 min-w-0">
              <span class="w-1 h-1 rounded-full shrink-0" :style="{ background: t.color }"></span>
              <span
                class="text-[10px] truncate"
                :class="t.status === 'done' ? 'line-through opacity-35' : 'opacity-70'"
              >{{ t.title }}</span>
            </div>
            <span v-if="c.tasks.length > PER_CELL" class="text-[9px] opacity-40 pl-2">
              +{{ c.tasks.length - PER_CELL }} 条
            </span>
          </div>
        </button>
      </div>

      <p class="text-[10px] opacity-40 mt-3 pl-1">点日期方块进入当天待办，可回看历史任务、也能提前安排未来任务</p>
    </div>
  </div>
</template>
