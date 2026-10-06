<script setup>
import { reactive, watch } from "vue";

const props = defineProps({ dark: Boolean, open: Boolean, editing: Object });
const emit = defineEmits(["close", "save"]);

const draft = reactive({ title: "", range: "" });

watch(() => props.open, (v) => {
  if (v) {
    draft.title = props.editing?.title || "";
    draft.range = props.editing?.range || "";
  }
});

function save() {
  if (!draft.title.trim()) return;
  emit("save", { title: draft.title, range: draft.range });
  emit("close");
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61, 74, 92, 0.25)">
    <div class="w-full max-w-sm rounded-2xl border shadow-sm p-6" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <h3 class="text-sm mb-4" style="font-family: 'Noto Serif SC', serif">{{ editing ? "修改时间轴" : "手动补录时间轴" }}</h3>
      <input v-model="draft.title" placeholder="事项名称…" class="w-full rounded-2xl border text-sm px-4 py-2 mb-3 focus:outline-none transition-all duration-300"
        :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
      <input v-model="draft.range" placeholder="如：14:00 — 15:00" class="w-full rounded-2xl border text-sm px-4 py-2 mb-4 focus:outline-none transition-all duration-300"
        :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
      <div class="flex gap-2">
        <button @click="emit('close')" class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
        <button @click="save" class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">保存</button>
      </div>
    </div>
  </div>
</template>
