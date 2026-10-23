<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  dark: Boolean,
  open: Boolean,
  /* wake = 起床（只填开始时间）；rest = 休息（只填结束时间） */
  kind: { type: String, default: "wake" },
  value: String,
  dateLabel: String,
});
const emit = defineEmits(["close", "save", "clear"]);

const time = ref("");

watch(
  () => props.open,
  (v) => { if (v) time.value = props.value || ""; },
);

const isWake = computed(() => props.kind === "wake");
const title = computed(() => `${props.value ? "修改" : "补录"}${isWake.value ? "起床" : "休息"}`);
const fieldLabel = computed(() => (isWake.value ? "起床时间（开始）" : "休息时间（结束）"));
const hint = computed(() => (isWake.value ? "补录起床只需填开始时间" : "补录休息只需填结束时间"));

function save() {
  if (!time.value) return;
  emit("save", time.value);
  emit("close");
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61, 74, 92, 0.25)">
    <div class="w-full max-w-xs rounded-2xl border shadow-sm p-6" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">{{ title }}</h3>
      <p class="text-[10px] opacity-50 mt-1 mb-4">{{ dateLabel }}</p>

      <div class="flex items-center gap-2 mb-2">
        <span class="text-[10px] opacity-55 pl-1">{{ fieldLabel }}</span>
      </div>
      <input
        v-model="time" type="time"
        class="w-full rounded-2xl border text-sm px-3 py-2 focus:outline-none transition-all duration-300 mb-1"
        :class="dark ? 'bg-white/5 border-white/10 text-[#ece8e1]' : 'border-[#3d4a5c]/15'"
        :style="dark ? 'color-scheme: dark' : ''"
      />
      <p class="text-[10px] opacity-45 mb-4">{{ hint }}</p>

      <div class="flex gap-2">
        <button
          v-if="value" @click="emit('clear'); emit('close')"
          class="rounded-2xl border text-xs px-3 py-2.5 opacity-60 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
        >清除</button>
        <button
          @click="emit('close')"
          class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
        >取消</button>
        <button
          @click="save" :disabled="!time"
          class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-35"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
        >保存</button>
      </div>
    </div>
  </div>
</template>
