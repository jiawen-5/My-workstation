<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRewards } from "../stores/rewards.js";
import { MILESTONE_PRESETS } from "../constants/rewards.js";
import StudyTimerModal from "../components/rewards/StudyTimerModal.vue";
import TaskRewardModal from "../components/rewards/TaskRewardModal.vue";
import RedeemListModal from "../components/rewards/RedeemListModal.vue";
import PointsHistoryModal from "../components/rewards/PointsHistoryModal.vue";

defineProps({ dark: Boolean, title: String, dateLine: String });

const {
  records,
  prizes,
  totalPoints,
  totalEarned,
  totalSpent,
  todayEarned,
  todayStudyMinutes,
  todayStudyPoints,
  tasks,
  milestones,
  timerFlash,
  load,
  addStudy,
  addItem,
  toggleItem,
  removeItem,
  addPrize,
  removePrize,
  redeem,
} = useRewards();

onMounted(() => load());

const showTimer = ref(false);
const showTasks = ref(false);
const showMilestones = ref(false);
const showRedeemList = ref(false);
const showHistory = ref(false);

const toast = ref("");
let toastTimer = null;
function say(text) {
  toast.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), 2400);
}
onBeforeUnmount(() => clearTimeout(toastTimer));

/* 番茄钟在 store 里跑，完成时给个全局反馈（切走再回来也能看到最新流水） */
watch(timerFlash, (v) => {
  if (v) say("番茄专注完成 · +1 积分已入账");
});

const taskPending = computed(() => tasks.value.filter((t) => !t.done).length);
const taskEarned = computed(() => tasks.value.filter((t) => t.done).reduce((n, t) => n + t.points, 0));
const msPending = computed(() => milestones.value.filter((t) => !t.done).length);
const msEarned = computed(() => milestones.value.filter((t) => t.done).reduce((n, t) => n + t.points, 0));
const topPrizes = computed(() => prizes.value.slice(0, 3));

async function onAward(payload) {
  const rec = await addStudy(payload);
  if (rec) say(`已记录 ${payload.minutes} 分钟学习 · +${rec.points} 积分`);
}

async function onAddItem(kind, draft) {
  const it = await addItem(kind, draft);
  if (it) say(`已添加「${it.title}」· 完成可得 ${it.points} 积分`);
}

async function onToggle(item) {
  const willDone = !item.done;
  await toggleItem(item);
  say(willDone ? `完成「${item.title}」· +${item.points} 积分` : `已取消完成 · 撤回 ${item.points} 积分`);
}

async function onRemoveItem(item) {
  await removeItem(item);
  say(`已删除「${item.title}」`);
}

async function onRedeem(p) {
  const res = await redeem(p);
  if (res.ok) say(`已兑换「${p.name}」· -${p.cost} 积分`);
  else if (res.reason === "points") say(`还差 ${res.lack} 积分才能兑换「${p.name}」`);
}

async function onAddPrize(draft) {
  const ok = await addPrize(draft);
  if (ok) say(`已添加奖品「${draft.name}」`);
}

async function onRemovePrize(p) {
  await removePrize(p);
  say(`已移除奖品「${p.name}」`);
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-10">
    <div class="mb-5">
      <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
      <p class="text-xs md:text-sm opacity-60 mt-1">{{ dateLine }}</p>
    </div>

    <!-- 积分总览 -->
    <div class="rounded-3xl border p-6 mb-8 relative overflow-hidden" :class="dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#3d4a5c]/12 bg-white/70'">
      <div class="absolute -right-12 -top-16 w-44 h-44 rounded-full pointer-events-none" style="background: #d4a5a5; opacity: 0.12"></div>
      <div class="absolute right-24 -bottom-20 w-36 h-36 rounded-full pointer-events-none" style="background: #a8c5b8; opacity: 0.12"></div>
      <div class="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[11px] opacity-55">当前积分</p>
          <div class="flex items-end gap-2 mt-1">
            <span class="text-[44px] leading-none tabular-nums" style="font-family: 'Noto Serif SC', serif">{{ totalPoints }}</span>
            <span class="text-[11px] opacity-45 mb-2">分</span>
            <span v-if="todayEarned" class="text-[10px] rounded-full px-2 py-0.5 mb-2 ml-1" :style="{ background: '#a8c5b82e', color: dark ? '#d7e6de' : '#5a7a6d' }">今日 +{{ todayEarned }}</span>
          </div>
          <p class="text-[10px] opacity-40 mt-2.5">累计获得 {{ totalEarned }} · 累计兑换 {{ totalSpent }} · 按 25 分钟 = 1 积分换算</p>
        </div>
        <button @click="showHistory = true" class="shrink-0 rounded-2xl border px-4 py-2 text-[11px] opacity-80 hover:opacity-100 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/12 hover:bg-white/5' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/5'">🕘 历史记录</button>
      </div>
    </div>

    <!-- 获取积分 -->
    <div class="flex items-end justify-between mb-3">
      <div class="flex items-baseline gap-2">
        <h2 class="text-sm" style="font-family: 'Noto Serif SC', serif">获取积分</h2>
        <span class="text-[10px] opacity-40">专注、完成任务、达成里程碑，都会立刻入账</span>
      </div>
    </div>

    <div class="grid md:grid-cols-3 gap-3 mb-3">
      <button @click="showTimer = true" class="text-left rounded-2xl border p-4 flex flex-col transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)] active:scale-[0.99]" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
        <div class="flex items-center gap-2.5 mb-2">
          <span class="w-9 h-9 shrink-0 rounded-2xl flex items-center justify-center text-base" :style="{ background: '#a8c5b82e' }">⏱</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs">学习计时</p>
            <p class="text-[10px] opacity-45">25 分钟 = 1 积分</p>
          </div>
          <span class="text-[11px] opacity-30">›</span>
        </div>
        <p class="text-[11px] opacity-55 leading-5 flex-1">番茄钟专注一轮自动加 1 分，也可以手动填写起止时间按四舍五入折算</p>
        <div class="flex items-center justify-between mt-2.5 pt-2.5 border-t text-[10px]" :class="dark ? 'border-white/8' : 'border-[#3d4a5c]/8'">
          <span class="opacity-45">今日 {{ todayStudyMinutes }} 分钟</span>
          <span class="text-[#5a7a6d]">+{{ todayStudyPoints }}</span>
        </div>
      </button>

      <button @click="showTasks = true" class="text-left rounded-2xl border p-4 flex flex-col transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)] active:scale-[0.99]" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
        <div class="flex items-center gap-2.5 mb-2">
          <span class="w-9 h-9 shrink-0 rounded-2xl flex items-center justify-center text-base" :style="{ background: '#d4a5a52e' }">✓</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs">任务完成</p>
            <p class="text-[10px] opacity-45">自定任务和积分</p>
          </div>
          <span class="text-[11px] opacity-30">›</span>
        </div>
        <p class="text-[11px] opacity-55 leading-5 flex-1">写下今天要做的小事，勾选完成就按你设定的分值加分，删掉会一起撤销</p>
        <div class="flex items-center justify-between mt-2.5 pt-2.5 border-t text-[10px]" :class="dark ? 'border-white/8' : 'border-[#3d4a5c]/8'">
          <span class="opacity-45">待完成 {{ taskPending }}</span>
          <span class="text-[#b78383]">+{{ taskEarned }}</span>
        </div>
      </button>

      <button @click="showMilestones = true" class="text-left rounded-2xl border p-4 flex flex-col transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)] active:scale-[0.99]" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
        <div class="flex items-center gap-2.5 mb-2">
          <span class="w-9 h-9 shrink-0 rounded-2xl flex items-center justify-center text-base" :style="{ background: '#b9b08a2e' }">★</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs">里程碑奖励</p>
            <p class="text-[10px] opacity-45">高积分大目标</p>
          </div>
          <span class="text-[11px] opacity-30">›</span>
        </div>
        <p class="text-[11px] opacity-55 leading-5 flex-1">给长期目标留一档奖励，比如坚持 30 天、跑完一次面试全流程</p>
        <div class="flex items-center justify-between mt-2.5 pt-2.5 border-t text-[10px]" :class="dark ? 'border-white/8' : 'border-[#3d4a5c]/8'">
          <span class="opacity-45">待达成 {{ msPending }}</span>
          <span class="text-[#8a8262]">+{{ msEarned }}</span>
        </div>
      </button>
    </div>

    <!-- 积分兑换 -->
    <div class="flex items-end justify-between mb-3 mt-7">
      <div class="flex items-baseline gap-2">
        <h2 class="text-sm" style="font-family: 'Noto Serif SC', serif">积分兑换</h2>
        <span class="text-[10px] opacity-40">攒够了就奖励自己</span>
      </div>
      <button @click="showRedeemList = true" class="text-[10px] opacity-50 hover:opacity-100 transition-all">奖品管理 ›</button>
    </div>

    <div v-if="!prizes.length" class="rounded-2xl border border-dashed py-8 text-center text-[11px] opacity-45" :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/20'">
      奖品库还是空的，点右上「奖品管理」加一个想要的奖励
    </div>
    <div v-else class="grid md:grid-cols-3 gap-3">
      <div v-for="p in topPrizes" :key="p.id" class="rounded-2xl border p-4 flex flex-col transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)]" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
        <div class="flex items-start justify-between">
          <span class="text-2xl leading-none">{{ p.emoji }}</span>
          <span v-if="p.used" class="text-[9px] opacity-30">已兑 {{ p.used }} 次</span>
        </div>
        <p class="text-xs mt-2.5">{{ p.name }}</p>
        <p class="text-[10px] opacity-45 mt-1 leading-4 flex-1">{{ p.note || "自定义奖品" }}</p>
        <button @click="onRedeem(p)" :disabled="totalPoints < p.cost"
          class="mt-3 rounded-xl text-[11px] py-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-35"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">
          {{ totalPoints >= p.cost ? `兑换 · ${p.cost} 积分` : `还差 ${p.cost - totalPoints} 积分` }}
        </button>
      </div>
    </div>

    <button @click="showRedeemList = true" class="w-full mt-3 rounded-2xl border border-dashed text-[11px] py-2.5 opacity-55 hover:opacity-100 transition-all duration-300 active:scale-[0.99]" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/18'">查看更多兑换奖品</button>

    <div class="pb-10"></div>

    <StudyTimerModal :dark="dark" :open="showTimer" @close="showTimer = false" @award="onAward" />

    <TaskRewardModal :dark="dark" :open="showTasks" title="任务完成" hint="自定义任务和分值，勾选即加分" placeholder="今天要完成的小事…"
      :items="tasks" @close="showTasks = false"
      @add="(d) => onAddItem('task', d)" @toggle="onToggle" @remove="onRemoveItem" />

    <TaskRewardModal :dark="dark" :open="showMilestones" title="里程碑奖励" hint="大目标达成后一次性发放的高积分" placeholder="例如：坚持早起 30 天…"
      :items="milestones" :presets="MILESTONE_PRESETS" @close="showMilestones = false"
      @add="(d) => onAddItem('milestone', d)" @toggle="onToggle" @remove="onRemoveItem" />

    <RedeemListModal :dark="dark" :open="showRedeemList" :prizes="prizes" :points="totalPoints"
      @close="showRedeemList = false" @redeem="onRedeem" @add="onAddPrize" @remove="onRemovePrize" />

    <PointsHistoryModal :dark="dark" :open="showHistory" :records="records" :points="totalPoints" @close="showHistory = false" />

    <transition name="toast">
      <div v-if="toast" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border shadow-sm px-4 py-2 text-[11px]"
        :class="dark ? 'bg-[#3a4152] border-white/12' : 'bg-white border-[#3d4a5c]/12'">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>