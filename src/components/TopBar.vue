<script setup>
defineProps({
  dark: Boolean,
  wakeTime: String,
  restTime: String,
});
const emit = defineEmits(["toggle-dark", "wake", "rest"]);
const search = defineModel("search");
</script>

<template>
  <header
    class="h-14 border-b flex items-center justify-between px-6 md:px-8 shrink-0 z-30 backdrop-blur-sm"
    :class="dark ? 'border-white/10 bg-[#2e3440]/90' : 'border-[#3d4a5c]/15 bg-[#faf9f7]/80'"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-7 h-7 rounded-xl flex items-center justify-center"
        :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
      >
        <span class="text-xs">工</span>
      </div>
      <span class="text-sm md:text-base" style="font-family: 'Noto Serif SC', serif">个人工作台</span>
    </div>

    <div class="hidden md:flex flex-1 max-w-md mx-8">
      <div class="relative w-full">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input
          v-model="search"
          placeholder="搜索日记、任务、笔记..."
          class="w-full rounded-2xl border text-sm pl-9 pr-4 py-2 focus:outline-none transition-all duration-300 ease-in-out"
          :class="dark ? 'border-white/10 bg-white/5 placeholder:text-white/30 focus:border-[#d4a5a5]/50' : 'border-[#3d4a5c]/15 focus:border-[#d4a5a5]/50'"
        />
      </div>
    </div>

    <div class="flex items-center gap-2 md:gap-3">
      <button
        @click="emit('wake')"
        class="flex items-center gap-1.5 rounded-2xl shadow-sm border px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'bg-[#a8c5b8]/15 border-[#a8c5b8]/25 hover:bg-[#a8c5b8]/25' : 'bg-[#a8c5b8]/20 border-[#a8c5b8]/30 hover:bg-[#a8c5b8]/30'"
      >
        <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke-linecap="round" />
        </svg>
        <span>起床</span><span class="text-xs opacity-65 hidden md:inline">{{ wakeTime }}</span>
      </button>
      <button
        @click="emit('rest')"
        class="flex items-center gap-1.5 rounded-2xl shadow-sm border px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'bg-[#d4a5a5]/15 border-[#d4a5a5]/25 hover:bg-[#d4a5a5]/25' : 'bg-[#d4a5a5]/20 border-[#d4a5a5]/30 hover:bg-[#d4a5a5]/30'"
      >
        <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>休息</span><span class="text-xs opacity-65 hidden md:inline">{{ restTime }}</span>
      </button>
      <button
        @click="emit('toggle-dark')"
        title="主题切换"
        class="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-2xl opacity-65 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'hover:bg-white/10' : 'hover:bg-[#3d4a5c]/8'"
      >
        <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </header>
</template>
