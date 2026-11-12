<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  dark: Boolean,
  open: Boolean,
  title: String,
  hint: String,
  items: { type: Array, default: () => [] },
  presets: { type: Array, default: () => [] },
  placeholder: { type: String, default: "任务名称…" },
});
const emit = defineEmits(["close", "add", "toggle", "remove"]);

const draftTitle = ref("");
const draftPoints = ref(1);
const removingId = ref(null);

const pending = computed(() => props.items.filter((i) => !i.done));
const achieved = computed(() => props.items.filter((i) => i.done));
const earned = computed(() => achieved.value.reduce((n, i) => n + i.points, 0));

watch(() => props.open, (v) => {
  if (!v) return;
  draftTitle.value = "";
  draftPoints.value = props.presets.length ? props.presets[0] : 1;
  removingId.value = null;
});

function add() {
  const t = draftTitle.value.trim();
  const p = Math.round(Number(draftPoints.value) || 0);
  if (!t || p <= 0) return;
  emit("add", { title: t, points: p });
  draftTitle.value = "";
}

function doRemove(it) {
  removingId.value = null;
  emit("remove", it);
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61,74,92,0.25)">
    <div class="w-full max-w-lg rounded-2xl border shadow-sm p-6" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">{{ title }}</h3>
          <p class="text-[10px] opacity-50 mt-1">{{ hint }}</p>
        </div>
        <button @click="emit('close')" class="w-7 h-7 shrink-0 flex items-center justify-center rounded-full border text-xs opacity-60 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">✕</button>
      </div>

      <div class="flex gap-2 mb-2">
        <input v-model="draftTitle" @keyup.enter="add" :placeholder="placeholder" class="flex-1 min-w-0 rounded-2xl border text-xs px-3 py-2 focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
        <input v-model.number="draftPoints" type="number" min="1" step="1" class="w-[74px] shrink-0 rounded-2xl border text-xs px-2 py-2 text-center focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
        <button @click="add" :disabled="!draftTitle.trim() || !(draftPoints > 0)" class="shrink-0 rounded-2xl text-xs px-3.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-35" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">添加</button>
      </div>
      <div v-if="presets.length" class="flex items-center gap-1.5 mb-4">
        <span class="text-[10px] opacity-40">常用档位</span>
        <button v-for="p in presets" :key="p" @click="draftPoints = p" class="text-[10px] rounded-lg border px-2 py-0.5 transition-all duration-300 active:scale-[0.98]" :class="draftPoints === p ? (dark ? 'bg-white/10 border-transparent' : 'bg-[#b9b08a]/20 border-transparent') : (dark ? 'border-white/12 opacity-55' : 'border-[#3d4a5c]/15 opacity-55')">{{ p }} 分</button>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1 mb-2 text-[10px]">
        <p class="opacity-50">待完成 {{ pending.length }} · 已完成 {{ achieved.length }} · 累计 +{{ earned }} 积分</p>
        <p class="opacity-35">勾选即入账，取消勾选会撤掉对应流水</p>
      </div>

      <div class="max-h-[42vh] overflow-y-auto pr-0.5">
        <p v-if="!items.length" class="text-[11px] opacity-40 rounded-xl border border-dashed py-6 text-center" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'">还没有条目，先在上面添加一条</p>
        <div v-for="it in items" :key="it.id" class="rounded-xl border px-2.5 py-2 mb-1.5 transition-all duration-300" :class="it.done ? (dark ? 'border-white/8 bg-white/[0.02]' : 'border-[#3d4a5c]/8 bg-[#3d4a5c]/[0.02]') : (dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12')">
          <div class="flex items-center gap-2">
            <button @click="emit('toggle', it)" class="w-[15px] h-[15px] shrink-0 rounded-[5px] border flex items-center justify-center text-[9px] leading-none transition-all duration-300 active:scale-[0.9]"
              :class="it.done ? 'bg-[#a8c5b8] border-[#a8c5b8] text-white' : (dark ? 'border-white/25' : 'border-[#3d4a5c]/30')">✓</button>
            <span class="text-[11px] flex-1 min-w-0 truncate" :class="it.done ? 'line-through opacity-40' : ''">{{ it.title }}</span>
            <span v-if="it.done" class="text-[9px] opacity-35 shrink-0">{{ (it.doneAt || '').slice(5, 10) }}</span>
            <span class="text-[10px] shrink-0" :class="it.done ? 'opacity-35' : 'text-[#b9b08a]'">+{{ it.points }}</span>
            <button @click="removingId = it.id" class="text-[10px] opacity-25 hover:opacity-70 shrink-0 transition-all">✕</button>
          </div>
          <div v-if="removingId === it.id" class="mt-2 flex items-center gap-2 pt-2 border-t" :class="dark ? 'border-white/8' : 'border-[#3d4a5c]/8'">
            <span class="text-[10px] opacity-50 flex-1">{{ it.done ? `会同时撤销 +${it.points} 积分流水` : "删除后不可恢复" }}</span>
            <button @click="removingId = null" class="text-[10px] px-2 py-1 rounded-lg border opacity-60" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
            <button @click="doRemove(it)" class="text-[10px] px-2 py-1 rounded-lg bg-[#c46a6a] text-white">删除</button>
          </div>
        </div>
      </div>

      <button @click="emit('close')" class="w-full mt-3 rounded-2xl border text-xs py-2.5 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">关闭</button>
    </div>
  </div>
</template>