<script setup>
import { dur } from "../../composables/useDay.js";

defineProps({ dark: Boolean, task: Object });
const emit = defineEmits(["start", "end", "reopen", "toggle-sub", "add-sub", "del-sub", "del-task", "switch-mode", "toggle-edit"]);
</script>

<template>
  <div
    class="rounded-2xl border shadow-sm p-6 md:p-8 mb-4 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)]"
    :class="dark ? 'bg-white/5 border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'"
  >
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: task.color }"></span>
        <input
          v-if="task.editing" v-model="task.title"
          class="rounded-xl border text-sm px-2 py-1 w-56 focus:outline-none"
          :class="dark ? 'bg-white/5 border-white/15' : 'border-[#3d4a5c]/20'"
        />
        <h3 v-else class="text-sm md:text-base truncate">{{ task.title }}</h3>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[10px] rounded-xl px-2 py-1 opacity-70" :style="{ background: task.color + '22' }">{{ task.priority }}优先级</span>
        <button v-if="task.status === 'todo'" @click="emit('start', task)"
          class="rounded-2xl shadow-sm text-xs px-3 py-1.5 border transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'bg-[#a8c5b8]/15 border-[#a8c5b8]/25' : 'bg-[#a8c5b8]/20 border-[#a8c5b8]/30'"
        >
          开始
        </button>
        <button
          v-else-if="task.status === 'doing'" @click="emit('end', task)" title="点击结束任务"
          class="group/end flex items-center gap-1.5 rounded-2xl text-xs px-3 py-1.5 transition-all duration-300 active:scale-[0.98] hover:opacity-90"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-[#a8c5b8] pulse-dot"></span>
          <span class="group-hover/end:hidden">进行中 · {{ task.startAt }}</span>
          <span class="hidden group-hover/end:inline">点击结束</span>
        </button>
        <button
          v-else @click="emit('reopen', task)" title="重新打开任务"
          class="flex items-center gap-1.5 rounded-2xl text-xs px-3 py-1.5 border opacity-75 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/15 hover:bg-white/5' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
        >
          <svg class="w-3 h-3 text-[#7fa897]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path d="m5 12 5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          已完成 · {{ dur(task.startAt, task.endAt) }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4 text-[10px] opacity-60">
      <span v-if="task.deadline">截止 {{ task.deadline }}</span>
      <span v-for="tag in task.tags" :key="tag" class="rounded-xl px-2 py-0.5 border" :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/15'"># {{ tag }}</span>
      <span class="ml-auto flex gap-2 opacity-100">
        <button @click="emit('switch-mode', task)" class="underline underline-offset-2">转为简单任务</button>
        <button @click="emit('toggle-edit', task)" class="underline underline-offset-2">{{ task.editing ? "完成改名" : "改名" }}</button>
        <button @click="emit('del-task', task)" class="underline underline-offset-2">删除</button>
      </span>
    </div>

    <div class="pl-5 space-y-2 border-l" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/12'">
      <div v-for="s in task.subs" :key="s.id" class="flex items-center gap-3 group">
        <div
          @click="emit('toggle-sub', task, s)"
          class="w-4 h-4 rounded-md border flex items-center justify-center cursor-pointer transition-all duration-300"
          :class="s.done ? 'border-[#a8c5b8]/50 bg-[#a8c5b8]/20' : 'border-[#3d4a5c]/20 hover:border-[#a8c5b8]/50'"
        >
          <svg class="w-3 h-3 text-[#7fa897]" :class="s.done ? '' : 'opacity-0'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path d="m5 12 5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <span @click="emit('toggle-sub', task, s)" class="text-xs md:text-sm cursor-pointer" :class="s.done ? 'opacity-50 line-through' : 'opacity-80'">{{ s.text }}</span>
        <span v-if="s.endAt" class="text-[10px] opacity-45">{{ s.startAt }} — {{ s.endAt }}</span>
        <button @click="emit('del-sub', task, s)" class="ml-auto text-[10px] opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-all duration-300">删除</button>
      </div>
      <div class="flex items-center gap-2 pt-1">
        <input
          v-model="task.newSub" @keyup.enter="emit('add-sub', task)" placeholder="手动新增子任务，回车添加…"
          class="flex-1 rounded-xl border text-xs px-3 py-1.5 focus:outline-none transition-all duration-300"
          :class="dark ? 'bg-white/5 border-white/10 focus:border-[#d4a5a5]/50' : 'border-[#3d4a5c]/15 focus:border-[#d4a5a5]/50'"
        />
        <button @click="emit('add-sub', task)" class="text-xs rounded-xl border px-3 py-1.5 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/15 hover:bg-white/5' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'">添加</button>
      </div>
    </div>
  </div>
</template>
