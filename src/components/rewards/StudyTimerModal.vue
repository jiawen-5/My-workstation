<script setup>
import { computed, ref, watch } from "vue";
import { MINUTES_PER_POINT, POMODORO_MINUTES } from "../../constants/rewards.js";
import { bjDateKey } from "../../composables/useDay.js";
import { useRewards } from "../../stores/rewards.js";
import DateField from "../DateField.vue";

const props = defineProps({ dark: Boolean, open: Boolean });
const emit = defineEmits(["close", "award"]);

/* 计时状态在 store 里，关掉弹窗、切到别的板块都不会中断 */
const { timerLeft, timerRunning, timerRounds, timerFlash, timerNote, startTimer, pauseTimer, resetTimer } = useRewards();

const tab = ref("pomodoro");
const TOTAL = POMODORO_MINUTES * 60;

const timeText = computed(() => {
  const m = Math.floor(timerLeft.value / 60);
  const s = timerLeft.value % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});
const progress = computed(() => 1 - timerLeft.value / TOTAL);
const R = 54;
const CIRC = 2 * Math.PI * R;
const dash = computed(() => `${CIRC * progress.value} ${CIRC}`);

/* ---- 手动补录：只填起止时间，积分自动四舍五入 ---- */
const f = ref({ date: bjDateKey(), start: "", end: "", note: "" });
const toMin = (v) => {
  const [h, m] = String(v || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const manualMinutes = computed(() => {
  if (!f.value.start || !f.value.end) return 0;
  const d = toMin(f.value.end) - toMin(f.value.start);
  if (d === 0) return 0;
  return d > 0 ? d : d + 24 * 60;
});
const crossDay = computed(() => !!f.value.start && !!f.value.end && toMin(f.value.end) < toMin(f.value.start));
const manualPoints = computed(() => Math.round(manualMinutes.value / MINUTES_PER_POINT));
const manualValid = computed(() => manualMinutes.value > 0 && manualPoints.value > 0);

function saveManual() {
  if (!manualValid.value) return;
  emit("award", {
    minutes: manualMinutes.value,
    note: f.value.note.trim(),
    mode: "manual",
    at: `${f.value.date} ${f.value.end}`,
  });
  // 记完就清空，下一次接着填；日期保留，通常同一天会补录多条
  f.value.start = "";
  f.value.end = "";
  f.value.note = "";
}

watch(
  () => props.open,
  (v) => {
    if (!v) return;
    if (!f.value.date) f.value.date = bjDateKey();
  },
);

const fmtDur = (min) => (min >= 60 ? `${Math.floor(min / 60)} 小时 ${min % 60} 分` : `${min} 分钟`);
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61,74,92,0.25)">
    <div class="w-full max-w-md rounded-2xl border shadow-sm p-6 relative" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">学习计时</h3>
          <p class="text-[10px] opacity-50 mt-1">25 分钟 = 1 积分 · 自动写入学习流水</p>
        </div>
        <button @click="emit('close')" class="w-7 h-7 flex items-center justify-center rounded-full border text-xs opacity-60 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">✕</button>
      </div>

      <div class="flex gap-1 rounded-2xl border p-1 mb-4" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/12'">
        <button @click="tab = 'pomodoro'" class="flex-1 rounded-xl text-[11px] py-1.5 transition-all duration-300 active:scale-[0.98]" :class="tab === 'pomodoro' ? (dark ? 'bg-white/10' : 'bg-[#a8c5b8]/22') : 'opacity-55 hover:opacity-80'">番茄钟</button>
        <button @click="tab = 'manual'" class="flex-1 rounded-xl text-[11px] py-1.5 transition-all duration-300 active:scale-[0.98]" :class="tab === 'manual' ? (dark ? 'bg-white/10' : 'bg-[#a8c5b8]/22') : 'opacity-55 hover:opacity-80'">手动填写</button>
      </div>

      <template v-if="tab === 'pomodoro'">
        <div class="flex flex-col items-center pt-1">
          <div class="relative w-[148px] h-[148px]">
            <svg viewBox="0 0 124 124" class="w-full h-full -rotate-90">
              <circle cx="62" cy="62" r="54" fill="none" :stroke="dark ? 'rgba(255,255,255,.1)' : 'rgba(61,74,92,.1)'" stroke-width="6" />
              <circle cx="62" cy="62" r="54" fill="none" stroke="#a8c5b8" stroke-width="6" stroke-linecap="round" :stroke-dasharray="dash" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[26px] tabular-nums leading-none" style="font-family: 'Noto Serif SC', serif">{{ timeText }}</span>
              <span class="text-[10px] opacity-45 mt-1.5">{{ timerRunning ? "专注中…" : timerLeft === TOTAL ? "准备开始" : "已暂停" }}</span>
            </div>
          </div>

          <div class="flex gap-2 mt-4">
            <button @click="timerRunning ? pauseTimer() : startTimer()" class="rounded-2xl px-6 py-2 text-xs transition-all duration-300 active:scale-[0.98]" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">{{ timerRunning ? "暂停" : timerLeft === TOTAL ? "开始专注" : "继续" }}</button>
            <button @click="resetTimer" class="rounded-2xl border px-4 py-2 text-xs opacity-65 hover:opacity-100 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">重置</button>
          </div>

          <p class="text-[10px] mt-2 h-4" :class="timerFlash ? 'text-[#5a7a6d]' : 'opacity-0'">本轮完成 · +1 积分已入账</p>
          <p class="text-[10px] opacity-45">本次已完成 {{ timerRounds }} 轮</p>
        </div>

        <p class="text-[10px] opacity-55 mt-4 mb-1.5 pl-1">学习备注（选填）</p>
        <textarea v-model="timerNote" rows="2" placeholder="这轮在学什么？" class="w-full rounded-2xl border text-xs px-3 py-2.5 focus:outline-none resize-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"></textarea>
        <p class="text-[10px] opacity-40 mt-1.5 pl-1">关掉弹窗、切到别的板块计时都不停，25 分钟到点自动记 1 积分</p>
      </template>

      <template v-else>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p class="text-[10px] opacity-55 mb-1.5 pl-1">学习日期</p>
            <DateField v-model="f.date" :dark="dark" />
          </div>
          <div>
            <p class="text-[10px] opacity-55 mb-1.5 pl-1">时长</p>
            <div class="rounded-xl border text-[11px] px-2.5 py-2 h-[34px] flex items-center" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">
              {{ manualMinutes ? fmtDur(manualMinutes) : "—" }}
            </div>
          </div>
          <div>
            <p class="text-[10px] opacity-55 mb-1.5 pl-1">开始时间</p>
            <input v-model="f.start" type="time" class="w-full rounded-xl border text-[11px] px-2.5 py-2 bg-transparent focus:outline-none" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'" :style="dark ? 'color-scheme: dark' : ''" />
          </div>
          <div>
            <p class="text-[10px] opacity-55 mb-1.5 pl-1">结束时间</p>
            <input v-model="f.end" type="time" class="w-full rounded-xl border text-[11px] px-2.5 py-2 bg-transparent focus:outline-none" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'" :style="dark ? 'color-scheme: dark' : ''" />
          </div>
        </div>

        <div class="rounded-2xl border px-3 py-2.5 mb-3 flex items-center justify-between" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12 bg-[#a8c5b8]/8'">
          <span class="text-[11px] opacity-60">自动换算积分（25 分钟 = 1 分，四舍五入）</span>
          <span class="text-sm" :class="manualPoints > 0 ? 'text-[#5a7a6d]' : 'opacity-40'">{{ manualPoints > 0 ? `+${manualPoints}` : "0" }}</span>
        </div>
        <p v-if="crossDay" class="text-[10px] opacity-45 mb-2 pl-1">结束时间早于开始时间，已按跨零点计算</p>
        <p v-else-if="f.start && f.end && !manualValid" class="text-[10px] opacity-45 mb-2 pl-1">不足 12.5 分钟不计分，可再学一会儿</p>

        <p class="text-[10px] opacity-55 mb-1.5 pl-1">学习备注（选填）</p>
        <textarea v-model="f.note" rows="2" placeholder="这段时间学了什么？" class="w-full rounded-2xl border text-xs px-3 py-2.5 mb-4 focus:outline-none resize-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"></textarea>

        <div class="flex gap-2">
          <button @click="emit('close')" class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">关闭</button>
          <button @click="saveManual" :disabled="!manualValid" class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-40" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">记为学习</button>
        </div>
      </template>
    </div>
  </div>
</template>