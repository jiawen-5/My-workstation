<script setup>
import { reactive } from "vue";
import { PRI_COLOR } from "../constants/nav.js";

const props = defineProps({ dark: Boolean, open: Boolean });
const emit = defineEmits(["close", "confirm"]);

const form = reactive({ title: "", priority: "中", deadline: "", tagInput: "", tags: [], mode: "sub" });

function reset() {
  form.title = "";
  form.priority = "中";
  form.deadline = "";
  form.tagInput = "";
  form.tags = [];
  form.mode = "sub";
}
function addTag() {
  const v = form.tagInput.trim();
  if (v && !form.tags.includes(v)) form.tags.push(v);
  form.tagInput = "";
}
function confirm() {
  if (!form.title.trim()) return;
  emit("confirm", { title: form.title, priority: form.priority, deadline: form.deadline, tags: [...form.tags], mode: form.mode });
  reset();
  emit("close");
}
defineExpose({ reset });
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61, 74, 92, 0.25)">
    <div class="w-full max-w-md rounded-2xl border shadow-sm p-6 transition-all duration-300" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <h3 class="text-sm mb-4" style="font-family: 'Noto Serif SC', serif">新建主任务</h3>
      <input v-model="form.title" placeholder="任务名称…" class="w-full rounded-2xl border text-sm px-4 py-2 mb-3 focus:outline-none transition-all duration-300"
        :class="dark ? 'bg-white/5 border-white/10 focus:border-[#d4a5a5]/50' : 'border-[#3d4a5c]/15 focus:border-[#d4a5a5]/50'" />
      <div class="flex gap-2 mb-3">
        <button v-for="p in ['高', '中', '低']" :key="p" @click="form.priority = p"
          class="flex-1 rounded-2xl border text-xs py-2 transition-all duration-300 active:scale-[0.98]"
          :class="form.priority === p ? 'border-transparent text-white' : dark ? 'border-white/10 opacity-60' : 'border-[#3d4a5c]/15 opacity-60'"
          :style="form.priority === p ? { background: PRI_COLOR[p] } : {}">{{ p }}优先级</button>
      </div>
      <input v-model="form.deadline" placeholder="截止时间（选填，如：今天 18:00）" class="w-full rounded-2xl border text-sm px-4 py-2 mb-3 focus:outline-none transition-all duration-300"
        :class="dark ? 'bg-white/5 border-white/10 focus:border-[#d4a5a5]/50' : 'border-[#3d4a5c]/15 focus:border-[#d4a5a5]/50'" />
      <div class="flex gap-2 mb-2">
        <input v-model="form.tagInput" @keyup.enter="addTag" placeholder="自定义标签，回车添加…" class="flex-1 rounded-2xl border text-xs px-3 py-2 focus:outline-none transition-all duration-300"
          :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
        <button @click="addTag" class="text-xs rounded-2xl border px-3 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/15'">添加</button>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        <span v-for="tag in form.tags" :key="tag" class="text-[10px] rounded-xl border px-2 py-1"># {{ tag }} <button @click="form.tags = form.tags.filter((x) => x !== tag)" class="opacity-60">✕</button></span>
      </div>
      <div class="flex gap-2 mb-5">
        <button @click="form.mode = 'sub'" class="flex-1 rounded-2xl border text-xs py-2.5 transition-all duration-300 active:scale-[0.98]"
          :class="form.mode === 'sub' ? (dark ? 'bg-white/10 border-transparent' : 'bg-[#d4a5a5]/15 border-transparent') : dark ? 'border-white/10 opacity-60' : 'border-[#3d4a5c]/15 opacity-60'">模式一 · 可拆分子任务</button>
        <button @click="form.mode = 'simple'" class="flex-1 rounded-2xl border text-xs py-2.5 transition-all duration-300 active:scale-[0.98]"
          :class="form.mode === 'simple' ? (dark ? 'bg-white/10 border-transparent' : 'bg-[#a8c5b8]/20 border-transparent') : dark ? 'border-white/10 opacity-60' : 'border-[#3d4a5c]/15 opacity-60'">模式二 · 无需拆分</button>
      </div>
      <div class="flex gap-2">
        <button @click="emit('close')" class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
        <button @click="confirm" class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">创建</button>
      </div>
    </div>
  </div>
</template>
