<script setup>
import { reactive, ref, watch } from "vue";
import { JOURNAL_EVENTS } from "../constants/journal.js";

const props = defineProps({ dark: Boolean, open: Boolean, editing: Object, categories: Array, moods: Array });
const emit = defineEmits(["close", "save", "delete", "add-category", "add-mood"]);

const draft = reactive({ event: JOURNAL_EVENTS[0], category: "", mood: "", content: "" });
const newCat = ref("");
const newMood = ref("");
const confirmDelete = ref(false);

watch(() => props.open, (v) => {
  if (!v) return;
  draft.event = props.editing?.event || JOURNAL_EVENTS[0];
  draft.category = props.editing?.category || "";
  draft.mood = props.editing?.mood || "";
  draft.content = props.editing?.content || "";
  newCat.value = "";
  newMood.value = "";
  confirmDelete.value = false;
});

const canSave = () => draft.event && draft.content.trim();

function save() {
  if (!canSave()) return;
  emit("save", { event: draft.event, category: draft.category, mood: draft.mood, content: draft.content.trim() });
  emit("close");
}

const pill = (on, color) => ({
  background: on ? `${color}26` : "transparent",
  borderColor: on ? `${color}66` : undefined,
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61,74,92,0.25)">
    <div class="w-full max-w-lg rounded-2xl border shadow-sm p-6 max-h-[90vh] overflow-y-auto relative" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">{{ editing ? "编辑日志" : "新增成长日志" }}</h3>
        <button v-if="editing" @click="confirmDelete = true" title="删除这条日志"
          class="w-7 h-7 flex items-center justify-center rounded-full text-[#c46a6a] border border-[#c46a6a]/30 bg-[#c46a6a]/10 hover:bg-[#c46a6a]/20 transition-all duration-300 active:scale-[0.95] text-sm leading-none">✕</button>
      </div>

      <p class="text-[10px] opacity-55 mb-2 pl-1">事件（五选一，不可自定义）</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <button v-for="e in JOURNAL_EVENTS" :key="e" @click="draft.event = e"
          class="rounded-2xl border text-xs px-4 py-1.5 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'" :style="pill(draft.event === e, '#a8c5b8')">{{ e }}</button>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p class="text-[10px] opacity-55 mb-2 pl-1">细分类型</p>
          <select v-model="draft.category" class="w-full rounded-2xl border text-xs px-3 py-2 focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15 bg-transparent'">
            <option value="">未分类</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <div class="flex gap-1.5 mt-1.5">
            <input v-model="newCat" placeholder="新增分类…" class="flex-1 min-w-0 rounded-xl border text-[11px] px-2.5 py-1.5 focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
            <button @click="newCat.trim() && (emit('add-category', newCat.trim()), draft.category = newCat.trim(), newCat = '')" class="rounded-xl border text-[11px] px-2.5 shrink-0 opacity-70 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">＋</button>
          </div>
        </div>
        <div>
          <p class="text-[10px] opacity-55 mb-2 pl-1">情绪标签</p>
          <select v-model="draft.mood" class="w-full rounded-2xl border text-xs px-3 py-2 focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15 bg-transparent'">
            <option value="">无情绪</option>
            <option v-for="m in moods" :key="m" :value="m">{{ m }}</option>
          </select>
          <div class="flex gap-1.5 mt-1.5">
            <input v-model="newMood" placeholder="新增情绪…" class="flex-1 min-w-0 rounded-xl border text-[11px] px-2.5 py-1.5 focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
            <button @click="newMood.trim() && (emit('add-mood', newMood.trim()), draft.mood = newMood.trim(), newMood = '')" class="rounded-xl border text-[11px] px-2.5 shrink-0 opacity-70 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">＋</button>
          </div>
        </div>
      </div>

      <p class="text-[10px] opacity-55 mb-2 pl-1">正文内容</p>
      <textarea v-model="draft.content" rows="5" placeholder="写下此刻的想法…" class="w-full rounded-2xl border text-sm px-4 py-3 mb-1 focus:outline-none resize-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"></textarea>
      <p class="text-[10px] opacity-50 mb-4 pl-1">保存时自动记录创建时间{{ editing ? "（编辑不改变原创建时间）" : "" }}</p>

      <div class="flex gap-2">
        <button @click="emit('close')" class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
        <button @click="save" :disabled="!canSave()" class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-40" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">保存</button>
      </div>

      <div v-if="confirmDelete" class="absolute inset-0 z-10 flex items-center justify-center p-6 rounded-2xl" style="background: rgba(61,74,92,0.35)">
        <div class="w-full max-w-xs rounded-2xl border shadow-sm p-5 text-center" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
          <p class="text-xs mb-4">确定删除这条日志吗？删除后无法恢复。</p>
          <div class="flex gap-2">
            <button @click="confirmDelete = false" class="flex-1 rounded-2xl border text-xs py-2 opacity-70" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
            <button @click="emit('delete'); emit('close')" class="flex-1 rounded-2xl text-xs py-2 bg-[#c46a6a] text-white">确定删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
