<script setup>
defineProps({
  dark: Boolean,
  dateLine: String,
  wakeTime: String,
  restTime: String,
  entries: Array,
});
const emit = defineEmits(["collapse", "create", "edit", "delete"]);
</script>

<template>
  <aside class="w-72 md:w-80 border-l flex flex-col shrink-0" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">
    <div class="flex items-center justify-between px-5 py-4 border-b" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">
      <div>
        <h2 class="text-sm md:text-base" style="font-family: 'Noto Serif SC', serif">今日时间轴</h2>
        <p class="text-[10px] opacity-60 mt-0.5">{{ dateLine }}</p>
      </div>
      <div class="flex gap-1">
        <button
          @click="emit('create')"
          title="手动补录"
          class="h-7 px-2 rounded-2xl text-xs border transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/15 hover:bg-white/5' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
        >
          ＋补录
        </button>
        <button
          @click="emit('collapse')"
          class="w-7 h-7 flex items-center justify-center rounded-2xl opacity-55 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'hover:bg-white/10' : 'hover:bg-[#3d4a5c]/8'"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-8 h-8 rounded-2xl bg-[#a8c5b8]/20 border border-[#a8c5b8]/30 flex items-center justify-center">
          <svg class="w-4 h-4 text-[#7fa897]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke-linecap="round" />
          </svg>
        </div>
        <div><p class="text-xs">起床</p><p class="text-[10px] opacity-60">{{ wakeTime || "尚未起床" }}</p></div>
      </div>

      <div v-for="e in entries" :key="e.id" class="flex items-start gap-3 mb-5 group">
        <div class="flex flex-col items-center self-stretch">
          <div class="w-2.5 h-2.5 rounded-full border-2 mt-1.5" :style="{ background: e.color, borderColor: dark ? '#2e3440' : '#faf9f7' }"></div>
          <div class="w-px flex-1 min-h-[2rem]" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/12'"></div>
        </div>
        <div class="flex-1">
          <div
            class="rounded-2xl border shadow-sm p-3 transition-all duration-300 group-hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)]"
            :class="e.active ? 'bg-[#a8c5b8]/12 border-[#a8c5b8]/25' : dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/12'"
          >
            <p class="text-xs">{{ e.title }}</p>
            <p class="text-[10px] opacity-60 mt-0.5">{{ e.range }}<span v-if="e.dur"> · {{ e.dur }}</span></p>
            <div class="flex items-center gap-2 mt-1">
              <span v-if="e.active" class="inline-flex items-center gap-1 text-[10px] text-[#7fa897]">
                <span class="w-1 h-1 rounded-full bg-[#7fa897] pulse-dot"></span>当前进行
              </span>
              <span v-else-if="e.tag" class="text-[10px] text-[#d4a5a5]">{{ e.tag }}</span>
              <span v-if="e.manual" class="text-[10px] opacity-45">手动补录</span>
              <span class="ml-auto hidden group-hover:flex gap-2 text-[10px] opacity-60">
                <button @click="emit('edit', e)" class="hover:opacity-100">修改</button>
                <button @click="emit('delete', e)" class="hover:opacity-100">删除</button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-2xl bg-[#d4a5a5]/12 border border-[#d4a5a5]/25 flex items-center justify-center">
          <svg class="w-4 h-4 text-[#b88585]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div><p class="text-xs opacity-60">休息</p><p class="text-[10px] opacity-40">{{ restTime || "尚未结束" }}</p></div>
      </div>
    </div>
  </aside>
</template>
