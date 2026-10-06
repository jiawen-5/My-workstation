<script setup>
import { computed } from "vue";
import SubTaskCard from "../components/todo/SubTaskCard.vue";
import SimpleTaskCard from "../components/todo/SimpleTaskCard.vue";
import { useWorkbench } from "../stores/workbench.js";

defineProps({ dark: Boolean, title: String, dateLine: String });
const emit = defineEmits(["open-create"]);

const wb = useWorkbench();
const modeSub = computed(() => wb.tasks.value.filter((t) => t.mode === "sub"));
const modeSimple = computed(() => wb.tasks.value.filter((t) => t.mode === "simple"));

function onSwitchMode(t) {
  wb.switchMode(t, t.mode === "sub" ? "simple" : "sub");
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
        <p class="text-xs md:text-sm opacity-60 mt-1">{{ dateLine }}</p>
      </div>
      <button
        @click="emit('open-create')"
        class="flex items-center gap-2 rounded-2xl shadow-sm px-4 py-2 text-xs md:text-sm transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
      >
        ＋ 新建任务
      </button>
    </div>

    <div class="flex items-center gap-2 mb-4">
      <span class="text-xs opacity-60">模式一 · 可拆分子任务</span>
      <div class="flex-1 h-px" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/12'"></div>
    </div>
    <div v-if="!modeSub.length" class="text-xs opacity-50 mb-4 rounded-2xl border border-dashed p-6 text-center" :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/20'">
      暂无复杂任务，点击右上新建任务
    </div>
    <SubTaskCard
      v-for="t in modeSub" :key="t.id" :dark="dark" :task="t"
      @start="wb.startTask" @toggle-sub="wb.toggleSub" @add-sub="wb.addSub"
      @del-sub="wb.delSub" @del-task="wb.delTask"
      @switch-mode="onSwitchMode" @toggle-edit="wb.tasks.value && (t.editing = !t.editing)"
    />

    <div class="flex items-center gap-2 mb-4 mt-8">
      <span class="text-xs opacity-60">模式二 · 无需拆分</span>
      <div class="flex-1 h-px" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/12'"></div>
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
