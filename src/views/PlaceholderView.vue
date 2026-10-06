<script setup>
defineProps({ dark: Boolean, title: String, dateLine: String, note: String });
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-10">
    <h1 class="text-xl md:text-2xl" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
    <p class="text-xs md:text-sm opacity-60 mt-1 mb-8">{{ dateLine }}</p>
    <div class="rounded-2xl border border-dashed p-10 text-center text-sm opacity-60" :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/20'">
      {{ note || `${title}页面待按 PRD 实现，当前为占位。` }}
    </div>
  </div>
</template>
