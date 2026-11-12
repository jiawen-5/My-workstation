<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  dark: Boolean,
  clearable: Boolean,
  placeholder: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const nativeEl = ref(null);
const valid = computed(() => /^\d{4}-\d{2}-\d{2}$/.test(props.modelValue || ""));
const text = computed(() => {
  if (!valid.value) return "";
  const [y, m, d] = props.modelValue.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
});
const hint = computed(() => props.placeholder || (props.clearable ? "不限" : "选择日期"));

/* 点击整块区域时主动打开原生选择器；老内核不支持 showPicker 时退回原生点击行为 */
function openPicker(e) {
  const el = nativeEl.value;
  if (!el || typeof el.showPicker !== "function") return;
  e?.preventDefault?.();
  try {
    el.showPicker();
  } catch {
    el.focus();
  }
}
function onPick(e) {
  emit("update:modelValue", e.target.value || "");
}
function clear() {
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="relative min-w-0">
    <div
      role="button"
      tabindex="0"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      class="flex items-center gap-1.5 w-full rounded-xl border text-[11px] px-2.5 py-2 cursor-pointer select-none transition-colors duration-200 focus:outline-none"
      :class="dark ? 'border-white/10 hover:border-white/20 focus-visible:border-white/40' : 'border-[#3d4a5c]/15 hover:border-[#3d4a5c]/30 focus-visible:border-[#3d4a5c]/50'"
    >
      <span class="flex-1 truncate" :class="text ? '' : 'opacity-40'">{{ text || hint }}</span>
      <svg class="w-3 h-3 shrink-0 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="3"></rect>
        <path d="M8 3v4M16 3v4M3.5 10h17"></path>
      </svg>
    </div>
    <input
      ref="nativeEl"
      type="date"
      :value="valid ? modelValue : ''"
      aria-label="选择日期"
      tabindex="-1"
      @click="openPicker"
      @change="onPick"
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
    <button
      v-if="clearable && text"
      type="button"
      @click.stop="clear"
      class="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-4 h-4 flex items-center justify-center rounded-full text-[9px] opacity-40 hover:opacity-80"
      :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'"
    >✕</button>
  </div>
</template>