<script setup>
import { dur } from "../../composables/useDay.js";

defineProps({ dark: Boolean, task: Object });
const emit = defineEmits(["start", "end", "reopen", "del-task", "switch-mode"]);
</script>

<template>
  <div
    class="rounded-2xl border shadow-sm p-6 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)]"
    :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/12'"
  >
    <div class="flex items-center gap-2.5 mb-2">
      <span class="w-1.5 h-1.5 rounded-full" :style="{ background: task.color }"></span>
      <h3 class="text-sm">{{ task.title }}</h3>
      <button @click="emit('del-task', task)" class="ml-auto text-[10px] opacity-40 hover:opacity-100 transition-all duration-300">删除</button>
    </div>
    <div class="text-[10px] opacity-55 mb-3">
      <span v-if="task.startAt">{{ task.startAt }} 开始</span>
      <span v-if="task.endAt"> · {{ task.endAt }} 结束 · {{ dur(task.startAt, task.endAt) }}</span>
      <span v-else-if="!task.startAt">尚未开始</span>
      <span v-else> · 进行中</span>
    </div>
    <div class="flex items-center gap-2">
      <template v-if="task.status === 'todo'">
        <button @click="emit('start', task)" class="rounded-2xl shadow-sm text-xs px-3 py-1.5 border transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'bg-[#a8c5b8]/15 border-[#a8c5b8]/25' : 'bg-[#a8c5b8]/20 border-[#a8c5b8]/30'">开始</button>
        <button @click="emit('switch-mode', task)" class="text-[10px] opacity-50 underline underline-offset-2">转为可拆分</button>
      </template>
      <template v-else-if="task.status === 'doing'">
        <span class="text-[10px] opacity-60">进行中 · {{ task.startAt }}</span>
        <button @click="emit('end', task)" class="rounded-2xl shadow-sm text-xs px-3 py-1.5 border opacity-80 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/15 hover:bg-white/5' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'">结束</button>
      </template>
      <template v-else>
        <span class="text-xs opacity-55">已完成 · {{ dur(task.startAt, task.endAt) }}</span>
        <button @click="emit('reopen', task)" class="text-[10px] opacity-50 underline underline-offset-2">重新打开</button>
      </template>
    </div>
  </div>
</template>
