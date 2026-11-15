<script setup>
import { computed, onMounted, ref } from "vue";
import { useLongPlan } from "../stores/longplan.js";
import { ICONS } from "../constants/nav.js";
import { PLAN_META, fmtMinutes, fmtKg } from "../constants/longplan.js";
import { bjDateKey, keyShortLabel, relativeLabel } from "../composables/useDay.js";
import PlanConfigModal from "../components/longplan/PlanConfigModal.vue";

defineProps({ dark: Boolean, title: String, dateLine: String });
const emit = defineEmits(["open-plan"]);

const lp = useLongPlan();
onMounted(() => lp.load());

const today = computed(() => bjDateKey());

const cfg = ref({ open: false, kind: "reading" });
function openConfig(kind) {
  cfg.value = { open: true, kind };
}
function saveConfig(patch) {
  lp.savePlan(cfg.value.kind, patch);
}

/* ---- 读书卡 ---- */
const reading = computed(() => {
  const plan = lp.planOf("reading");
  const cycle = lp.cycleOf("reading");
  const goal = Number(plan.targets.dailyMinutes) || 30;
  const todayMinutes = lp.minutesOn(today.value);
  const week = lp.recentDays(7);
  const best = Math.max(goal, ...week.map((d) => d.minutes), 1);
  return {
    plan,
    cycle,
    goal,
    todayMinutes,
    total: lp.totalMinutes.value,
    active: lp.activeBooks.value.length,
    done: lp.doneBooks.value.length,
    week,
    best,
    goalPercent: Math.min(100, Math.round((todayMinutes / goal) * 100)),
  };
});

/* ---- 减肥卡 ---- */
const diet = computed(() => {
  const plan = lp.planOf("diet");
  const cycle = lp.cycleOf("diet");
  const sum = lp.dietSummary(today.value);
  const current = lp.latestWeight.value;
  const start = Number(plan.targets.startWeight) || 0;
  const target = Number(plan.targets.targetWeight) || 0;
  const waterGoal = Number(plan.targets.waterGoal) || 2000;
  const intakeGoal = Number(plan.targets.intakeGoal) || 1600;
  /* 已减：拿起始体重减当前体重；还没记体重时显示「未记录」 */
  const lost = current > 0 && start > 0 ? Math.round((start - current) * 10) / 10 : null;
  const toGo = current > 0 && target > 0 ? Math.round((current - target) * 10) / 10 : null;
  const week = lp.recentDays(7);
  const best = Math.max(intakeGoal, ...week.map((d) => d.intake), 1);
  return {
    plan,
    cycle,
    sum,
    current,
    start,
    target,
    waterGoal,
    intakeGoal,
    lost,
    toGo,
    week,
    best,
    intakePercent: Math.min(100, Math.round((sum.intake / intakeGoal) * 100)),
    waterPercent: Math.min(100, Math.round((sum.waterMl / waterGoal) * 100)),
  };
});

const cardClass = (dark) =>
  dark
    ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
    : "bg-white/60 border-[#3d4a5c]/12 hover:bg-white";
const tileClass = (dark) => (dark ? "bg-white/5" : "bg-[#3d4a5c]/[0.04]");
</script>

<template>
  <div class="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-10">
    <div class="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
        <p class="text-xs md:text-sm opacity-60 mt-1">一张卡一个计划 · 点卡片进入明细，右上角齿轮改周期</p>
      </div>
      <p class="text-[10px] opacity-45 shrink-0 mt-1">{{ dateLine }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
      <!-- 读书计划 -->
      <button
        @click="emit('open-plan', 'reading')"
        class="group text-left rounded-2xl border p-5 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(61,74,92,0.08)] active:scale-[0.995]"
        :class="cardClass(dark)"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :style="{ background: PLAN_META.reading.accent + '2e', color: PLAN_META.reading.accent }"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" v-html="ICONS.读书"></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm truncate" style="font-family: 'Noto Serif SC', serif">{{ reading.plan.title }}</p>
            <p class="text-[10px] opacity-50 mt-0.5 truncate">{{ PLAN_META.reading.desc }}</p>
          </div>
          <span
            role="button" tabindex="0" title="设置周期"
            @click.stop="openConfig('reading')" @keydown.enter.stop="openConfig('reading')"
            class="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-lg border opacity-45 hover:opacity-90 transition-all duration-300"
            :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
            </svg>
          </span>
        </div>

        <!-- 周期进度 -->
        <div class="mt-4">
          <div class="flex items-center justify-between text-[10px] mb-1.5">
            <span class="opacity-60">第 {{ reading.cycle.day }} / {{ reading.cycle.total }} 天</span>
            <span class="opacity-40">{{ reading.cycle.overrun ? "周期已结束" : `还剩 ${reading.cycle.left} 天` }}</span>
          </div>
          <div class="h-1.5 rounded-full overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
            <div class="h-full rounded-full transition-all duration-500" :style="{ width: reading.cycle.percent + '%', background: PLAN_META.reading.accent }"></div>
          </div>
          <p class="text-[10px] opacity-40 mt-1.5">{{ keyShortLabel(reading.cycle.startDate) }} 起 · {{ relativeLabel(reading.cycle.startDate, today) }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-4">
          <div class="rounded-xl px-2.5 py-2" :class="tileClass(dark)">
            <p class="text-[9px] opacity-50">今日阅读</p>
            <p class="text-xs mt-0.5">
              {{ reading.todayMinutes }} <span class="text-[9px] opacity-45">/ {{ reading.goal }} 分钟</span>
            </p>
            <div class="h-1 rounded-full mt-1.5 overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
              <div class="h-full rounded-full" :style="{ width: reading.goalPercent + '%', background: PLAN_META.reading.accent }"></div>
            </div>
          </div>
          <div class="rounded-xl px-2.5 py-2" :class="tileClass(dark)">
            <p class="text-[9px] opacity-50">累计时长</p>
            <p class="text-xs mt-0.5 truncate">{{ fmtMinutes(reading.total) }}</p>
            <p class="text-[9px] opacity-40 mt-1.5">在读 {{ reading.active }} 本 · 读完 {{ reading.done }}</p>
          </div>
        </div>

        <!-- 近 7 天 -->
        <div class="flex items-end gap-1 mt-4 h-8">
          <div v-for="d in reading.week" :key="d.key" class="flex-1 flex flex-col items-center gap-1">
            <div
              class="w-full rounded-sm transition-all duration-500"
              :style="{ height: Math.max(2, (d.minutes / reading.best) * 24) + 'px', background: PLAN_META.reading.accent, opacity: d.minutes ? 0.75 : 0.18 }"
            ></div>
            <span class="text-[8px] opacity-35">{{ d.day }}</span>
          </div>
        </div>

        <p class="text-[10px] mt-3 opacity-45 group-hover:opacity-80 transition-all duration-300">进入详情 ›</p>
      </button>

      <!-- 减肥计划 -->
      <button
        @click="emit('open-plan', 'diet')"
        class="group text-left rounded-2xl border p-5 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(61,74,92,0.08)] active:scale-[0.995]"
        :class="cardClass(dark)"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :style="{ background: PLAN_META.diet.accent + '2e', color: PLAN_META.diet.accent }"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" v-html="ICONS.减肥"></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm truncate" style="font-family: 'Noto Serif SC', serif">{{ diet.plan.title }}</p>
            <p class="text-[10px] opacity-50 mt-0.5 truncate">{{ PLAN_META.diet.desc }}</p>
          </div>
          <span
            role="button" tabindex="0" title="设置周期"
            @click.stop="openConfig('diet')" @keydown.enter.stop="openConfig('diet')"
            class="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-lg border opacity-45 hover:opacity-90 transition-all duration-300"
            :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
            </svg>
          </span>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between text-[10px] mb-1.5">
            <span class="opacity-60">第 {{ diet.cycle.day }} / {{ diet.cycle.total }} 天</span>
            <span class="opacity-40">{{ diet.cycle.overrun ? "周期已结束" : `还剩 ${diet.cycle.left} 天` }}</span>
          </div>
          <div class="h-1.5 rounded-full overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
            <div class="h-full rounded-full transition-all duration-500" :style="{ width: diet.cycle.percent + '%', background: PLAN_META.diet.accent }"></div>
          </div>
          <p class="text-[10px] opacity-40 mt-1.5">{{ keyShortLabel(diet.cycle.startDate) }} 起 · {{ relativeLabel(diet.cycle.startDate, today) }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-4">
          <div class="rounded-xl px-2.5 py-2" :class="tileClass(dark)">
            <p class="text-[9px] opacity-50">当前体重</p>
            <p class="text-xs mt-0.5">{{ diet.current > 0 ? fmtKg(diet.current) : "未记录" }}</p>
            <p class="text-[9px] opacity-40 mt-1.5">目标 {{ fmtKg(diet.target) }}</p>
          </div>
          <div class="rounded-xl px-2.5 py-2" :class="tileClass(dark)">
            <p class="text-[9px] opacity-50">距离目标</p>
            <p class="text-xs mt-0.5">{{ diet.toGo !== null ? (diet.toGo > 0 ? `还差 ${diet.toGo} kg` : "已达成") : "—" }}</p>
            <p class="text-[9px] opacity-40 mt-1.5">{{ diet.lost !== null && diet.lost > 0 ? `已减 ${diet.lost} kg` : "尚未减重" }}</p>
          </div>
        </div>

        <div class="mt-2 space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="text-[9px] opacity-45 w-8 shrink-0">摄入</span>
            <div class="flex-1 h-1 rounded-full overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
              <div class="h-full rounded-full" :style="{ width: diet.intakePercent + '%', background: PLAN_META.diet.accent }"></div>
            </div>
            <span class="text-[9px] opacity-60 shrink-0 tabular-nums">{{ diet.sum.intake }} / {{ diet.intakeGoal }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] opacity-45 w-8 shrink-0">饮水</span>
            <div class="flex-1 h-1 rounded-full overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
              <div class="h-full rounded-full" :style="{ width: diet.waterPercent + '%', background: '#a8c5b8' }"></div>
            </div>
            <span class="text-[9px] opacity-60 shrink-0 tabular-nums">{{ diet.sum.waterMl }} / {{ diet.waterGoal }} ml</span>
          </div>
          <p class="text-[9px] opacity-40 pt-0.5">运动消耗 {{ diet.sum.burn }} kcal · 净摄入 {{ diet.sum.net }} kcal</p>
        </div>

        <p class="text-[10px] mt-3 opacity-45 group-hover:opacity-80 transition-all duration-300">进入详情 ›</p>
      </button>

      <!-- 第三个位置先占位，保持一行三卡的节奏 -->
      <div
        class="rounded-2xl border border-dashed p-5 flex flex-col items-center justify-center text-center min-h-[260px]"
        :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
      >
        <div class="w-9 h-9 rounded-xl flex items-center justify-center opacity-30 mb-2" :class="dark ? 'bg-white/8' : 'bg-[#3d4a5c]/8'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
        </div>
        <p class="text-[11px] opacity-45">空位</p>
        <p class="text-[10px] opacity-30 mt-1 leading-5 px-2">以后加新计划（健身、攒钱…）<br />直接往这里补一张卡</p>
      </div>
    </div>

    <p class="text-[10px] opacity-40 mt-5 pl-1">
      周期从「开始日期」算起，改周期不会动已有记录；饮食热量按每 100g 估算，运动消耗按 MET × 体重算
    </p>

    <PlanConfigModal
      :dark="dark" :open="cfg.open" :kind="cfg.kind" :plan="lp.planOf(cfg.kind)"
      @close="cfg.open = false" @save="saveConfig"
    />
  </div>
</template>
