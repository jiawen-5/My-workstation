<script setup>
import { computed, reactive, watch } from "vue";
import { dur, parseRange } from "../composables/useDay.js";

const props = defineProps({ dark: Boolean, open: Boolean, editing: Object });
const emit = defineEmits(["close", "save"]);

const draft = reactive({ title: "", start: "", end: "" });

watch(() => props.open, (v) => {
  if (v) {
    draft.title = props.editing?.title || "";
    const parsed = parseRange(props.editing?.range);
    draft.start = parsed.start;
    draft.end = parsed.end;
  }
});

const durationText = computed(() => dur(draft.start, draft.end));
// 两端都填了但算不出时长，说明结束时间没晚于开始时间
const invalid = computed(() => !!draft.start && !!draft.end && !durationText.value);
const hint = computed(() => {
  if (invalid.value) return { text: "结束时间需要晚于开始时间", warn: true };
  if (durationText.value) return { text: `时长 ${durationText.value}`, warn: false };
  return { text: "只填开始时间也可以，留空结束时间表示仍在进行", warn: false };
});

function save() {
  if (!draft.title.trim() || invalid.value) return;
  const range = draft.start && draft.end ? `${draft.start} — ${draft.end}` : draft.start;
  emit("save", { title: draft.title, range, dur: durationText.value, end: draft.end });
  emit("close");
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61, 74, 92, 0.25)">
    <div class="w-full max-w-sm rounded-2xl border shadow-sm p-6" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <h3 class="text-sm mb-4" style="font-family: 'Noto Serif SC', serif">{{ editing ? "修改时间轴" : "手动补录时间轴" }}</h3>
      <input v-model="draft.title" placeholder="事项名称…" class="w-full rounded-2xl border text-sm px-4 py-2 mb-3 focus:outline-none transition-all duration-300"
        :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
      <div class="grid grid-cols-2 gap-2 mb-1">
        <span class="text-[10px] opacity-55 pl-1">开始时间</span>
        <span class="text-[10px] opacity-55 pl-1">结束时间（可留空）</span>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input v-model="draft.start" type="time" class="w-full rounded-2xl border text-sm px-3 py-2 focus:outline-none transition-all duration-300"
          :class="dark ? 'bg-white/5 border-white/10 text-[#ece8e1]' : 'border-[#3d4a5c]/15'" :style="dark ? 'color-scheme: dark' : ''" />
        <input v-model="draft.end" type="time" class="w-full rounded-2xl border text-sm px-3 py-2 focus:outline-none transition-all duration-300"
          :class="dark ? 'bg-white/5 border-white/10 text-[#ece8e1]' : 'border-[#3d4a5c]/15'" :style="dark ? 'color-scheme: dark' : ''" />
      </div>
      <p class="text-[10px] mb-4" :class="hint.warn ? 'text-[#d4a5a5]' : 'opacity-50'">{{ hint.text }}</p>
      <div class="flex gap-2">
        <button @click="emit('close')" class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
        <button @click="save" class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">保存</button>
      </div>
    </div>
  </div>
</template>
