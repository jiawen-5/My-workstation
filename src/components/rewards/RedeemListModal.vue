<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({ dark: Boolean, open: Boolean, prizes: { type: Array, default: () => [] }, points: { type: Number, default: 0 } });
const emit = defineEmits(["close", "redeem", "add", "remove"]);

const f = ref({ name: "", cost: 10, emoji: "🎁" });
const pendingRemove = ref(null);

const sorted = computed(() => [...props.prizes].sort((a, b) => a.cost - b.cost));
const canAdd = computed(() => f.value.name.trim() && Number(f.value.cost) > 0);

watch(() => props.open, (v) => {
  if (!v) return;
  f.value = { name: "", cost: 10, emoji: "🎁" };
  pendingRemove.value = null;
});

function confirmRemove() {
  if (!pendingRemove.value) return;
  const target = pendingRemove.value;
  pendingRemove.value = null;
  emit("remove", target);
}

function add() {
  if (!canAdd.value) return;
  emit("add", { name: f.value.name.trim(), cost: Math.round(Number(f.value.cost) || 0), emoji: f.value.emoji.trim() || "🎁" });
  f.value = { name: "", cost: Math.round(Number(f.value.cost) || 10) || 10, emoji: "🎁" };
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61,74,92,0.25)">
    <div class="w-full max-w-2xl rounded-2xl border shadow-sm p-6" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">兑换奖品</h3>
          <p class="text-[10px] opacity-50 mt-1">当前 {{ points }} 积分 · 共 {{ prizes.length }} 个奖品，奖品和所需积分都可以自定义</p>
        </div>
        <button @click="emit('close')" class="w-7 h-7 shrink-0 flex items-center justify-center rounded-full border text-xs opacity-60 hover:opacity-100" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">✕</button>
      </div>

      <div class="flex gap-2 mb-2">
        <input v-model="f.emoji" maxlength="2" class="w-11 shrink-0 rounded-2xl border text-sm px-1 py-2 text-center focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
        <input v-model="f.name" @keyup.enter="add" placeholder="奖品名称…" class="flex-1 min-w-0 rounded-2xl border text-xs px-3 py-2 focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
        <input v-model.number="f.cost" type="number" min="1" step="1" class="w-[78px] shrink-0 rounded-2xl border text-xs px-2 py-2 text-center focus:outline-none" :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'" />
        <button @click="add" :disabled="!canAdd" class="shrink-0 rounded-2xl text-xs px-3.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-35" :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">添加</button>
      </div>
      <p class="text-[10px] opacity-40 mb-3 pl-1">第一个格子填个表情，右边填名称和所需积分</p>

      <div class="max-h-[46vh] overflow-y-auto pr-0.5 grid md:grid-cols-2 gap-2">
        <p v-if="!prizes.length" class="md:col-span-2 text-[11px] opacity-40 rounded-xl border border-dashed py-6 text-center" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'">奖品库空了，加一个想要的奖励吧</p>
        <div v-for="p in sorted" :key="p.id" class="rounded-2xl border p-3 flex flex-col" :class="dark ? 'border-white/10 bg-white/5' : 'border-[#3d4a5c]/12'">
          <div class="flex items-start gap-2">
            <span class="text-xl leading-none">{{ p.emoji }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-xs truncate">{{ p.name }}</p>
              <p class="text-[10px] opacity-45 truncate">{{ p.note || "自定义奖品" }}</p>
            </div>
            <button @click="pendingRemove = p" class="text-[10px] opacity-25 hover:opacity-70 shrink-0">✕</button>
          </div>
          <div class="flex items-center gap-2 mt-2.5">
            <span class="text-[10px] opacity-45 flex-1">{{ p.cost }} 积分<span v-if="p.used"> · 已兑换 {{ p.used }} 次</span></span>
            <button @click="emit('redeem', p)" :disabled="points < p.cost"
              class="rounded-xl text-[10px] px-3 py-1.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-35"
              :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'">
              {{ points >= p.cost ? "兑换" : `还差 ${p.cost - points}` }}
            </button>
          </div>
        </div>
      </div>

      <button @click="emit('close')" class="w-full mt-3 rounded-2xl border text-xs py-2.5 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">关闭</button>
    </div>
  </div>

  <!-- 删除确认：单独一层小窗，浮在奖品弹窗之上 -->
  <div v-if="open && pendingRemove" class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background: rgba(61,74,92,0.35)" @click.self="pendingRemove = null">
    <div class="w-full max-w-xs rounded-2xl border shadow-sm p-5 text-center" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <p class="text-xs mb-1.5">删掉这个奖品？历史兑换记录会保留</p>
      <p class="text-[10px] opacity-50 mb-4 truncate">{{ pendingRemove.emoji }} {{ pendingRemove.name }}</p>
      <div class="flex gap-2">
        <button @click="pendingRemove = null" class="flex-1 rounded-2xl border text-xs py-2 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'">取消</button>
        <button @click="confirmRemove" class="flex-1 rounded-2xl text-xs py-2 bg-[#c46a6a] text-white transition-all duration-300 active:scale-[0.98]">确认删除</button>
      </div>
    </div>
  </div>
</template>