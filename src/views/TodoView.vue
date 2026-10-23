<script setup>
import { computed } from "vue";
import SubTaskCard from "../components/todo/SubTaskCard.vue";
import SimpleTaskCard from "../components/todo/SimpleTaskCard.vue";
import { useWorkbench } from "../stores/workbench.js";
import { addDays, keyLabel, relativeLabel } from "../composables/useDay.js";

const props = defineProps({ dark: Boolean, title: String, dateKey: String });
const emit = defineEmits(["open-create", "back"]);

const wb = useWorkbench();

/* 详情页只看选中那一天的任务；任务在库里带 biz_date，所以历史/未来都能翻 */
const dayTasks = computed(() => wb.tasksOn(props.dateKey));
const modeSub = computed(() => dayTasks.value.filter((t) => t.mode === "sub"));
const modeSimple = computed(() => dayTasks.value.filter((t) => t.mode === "simple"));

const summary = computed(() => {
  const list = dayTasks.value;
  const done = list.filter((t) => t.status === "done").length;
  const doing = list.filter((t) => t.status === "doing").length;
  return { total: list.length, done, doing, todo: list.length - done - doing };
});

const dateLine = computed(() => keyLabel(props.dateKey));
const rel = computed(() => relativeLabel(props.dateKey, wb.today.value));
const isToday = computed(() => props.dateKey === wb.today.value);

function go(n) {
  wb.setDate(addDays(props.dateKey, n));
}
function onSwitchMode(t) {
  wb.switchMode(t, t.mode === "sub" ? "simple" : "sub");
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-10">
    <button
      @click="emit('back')"
      class="inline-flex items-center gap-1.5 rounded-2xl text-xs opacity-60 hover:opacity-100 transition-all duration-300 mb-4 active:scale-[0.98]"
    >
      <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      返回总览
    </button>

    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2">
        <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
        <span
          class="text-[10px] rounded-full px-2 py-0.5 border"
          :class="isToday
            ? 'border-[#d4a5a5]/45 bg-[#d4a5a5]/15 text-[#b88585]'
            : (dark ? 'border-white/12 opacity-60' : 'border-[#3d4a5c]/15 opacity-60')"
        >{{ rel }}</span>
      </div>
      <button
        @click="emit('open-create')"
        class="flex items-center gap-2 rounded-2xl shadow-sm px-4 py-2 text-xs md:text-sm transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
      >
        ＋ 新建该日待办
      </button>
    </div>

    <!-- 日期放在前一天 / 后一天中间，切日时一起变 -->
    <div class="flex items-stretch gap-2 mb-6">
      <button
        @click="go(-1)"
        title="前一天"
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'border-white/12 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
      >
        <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div
        class="flex-1 min-w-0 flex items-center justify-center px-4 rounded-2xl border text-sm md:text-base"
        :class="dark ? 'border-white/12 bg-white/[0.03]' : 'border-[#3d4a5c]/12'"
      >
        <span class="truncate">{{ dateLine }}</span>
      </div>
      <button
        @click="go(1)"
        title="后一天"
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'border-white/12 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
      >
        <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <p class="text-[11px] opacity-50 mb-6">
      共 {{ summary.total }} 条 · 待开始 {{ summary.todo }} · 进行中 {{ summary.doing }} · 已完成 {{ summary.done }}
    </p>

    <div class="flex items-center gap-2 mb-4">
      <span class="text-xs opacity-60">模式一 · 可拆分子任务</span>
      <div class="flex-1 h-px" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/12'"></div>
    </div>
    <div
      v-if="!modeSub.length"
      class="text-xs opacity-50 mb-4 rounded-2xl border border-dashed p-6 text-center"
      :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/20'"
    >
      这一天还没有可拆分的任务
    </div>
    <SubTaskCard
      v-for="t in modeSub" :key="t.id" :dark="dark" :task="t"
      @start="wb.startTask" @end="wb.endTask" @reopen="wb.reopenTask"
      @toggle-sub="wb.toggleSub" @add-sub="wb.addSub"
      @del-sub="wb.delSub" @del-task="wb.delTask"
      @switch-mode="onSwitchMode" @toggle-edit="wb.toggleEdit"
    />

    <div class="flex items-center gap-2 mb-4 mt-8">
      <span class="text-xs opacity-60">模式二 · 无需拆分</span>
      <div class="flex-1 h-px" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/12'"></div>
    </div>
    <div
      v-if="!modeSimple.length"
      class="text-xs opacity-50 mb-4 rounded-2xl border border-dashed p-6 text-center"
      :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/20'"
    >
      这一天还没有简单任务
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
      <SimpleTaskCard
        v-for="t in modeSimple" :key="t.id" :dark="dark" :task="t"
        @start="wb.startTask" @end="wb.endSimple" @reopen="wb.reopenSimple"
        @del-task="wb.delTask" @switch-mode="onSwitchMode"
      />
    </div>
  </div>
</template>
