<script setup>
import { computed, ref, watch } from "vue";
import DateField from "../DateField.vue";
import { CYCLE_OPTIONS, DEFAULT_TARGETS, PLAN_META } from "../../constants/longplan.js";

const props = defineProps({
  dark: Boolean,
  open: Boolean,
  kind: { type: String, default: "reading" },
  plan: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["close", "save"]);

const form = ref({ title: "", cycleDays: 30, startDate: "", targets: {} });

/* 每次打开都用最新配置回填，避免上次取消留下的半截输入 */
watch(
  () => props.open,
  (v) => {
    if (!v) return;
    form.value = {
      title: props.plan.title || PLAN_META[props.kind]?.title || "",
      cycleDays: Number(props.plan.cycleDays) || 30,
      startDate: props.plan.startDate || "",
      targets: { ...(DEFAULT_TARGETS[props.kind] || {}), ...(props.plan.targets || {}) },
    };
  },
  { immediate: true },
);

const isDiet = computed(() => props.kind === "diet");
const accent = computed(() => PLAN_META[props.kind]?.accent || "#a8c5b8");

const inputClass = computed(() =>
  props.dark
    ? "bg-white/5 border-white/10 text-[#ece8e1] placeholder-white/25"
    : "border-[#3d4a5c]/15 placeholder-[#3d4a5c]/30",
);
const labelClass = "text-[10px] opacity-55 pl-1 mb-1 block";

function fmtTitle() {
  const v = Number(form.value.cycleDays) || 30;
  form.value.cycleDays = Math.max(1, Math.round(v));
}

function save() {
  fmtTitle();
  emit("save", {
    title: String(form.value.title || "").trim(),
    cycleDays: form.value.cycleDays,
    startDate: form.value.startDate,
    targets: { ...form.value.targets },
  });
  emit("close");
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61, 74, 92, 0.25)" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border shadow-sm p-6" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
      <div class="flex items-center gap-2 mb-1">
        <span class="w-1.5 h-1.5 rounded-full" :style="{ background: accent }"></span>
        <h3 class="text-sm" style="font-family: 'Noto Serif SC', serif">{{ PLAN_META[kind]?.title }} · 设置</h3>
      </div>
      <p class="text-[10px] opacity-50 mb-4">周期决定卡片上的「第几天」，改开始日期可以重新起算</p>

      <label :class="labelClass">计划名称</label>
      <input
        v-model="form.title" type="text" maxlength="20"
        class="w-full rounded-2xl border text-xs px-3 py-2 mb-3 focus:outline-none transition-all duration-300"
        :class="inputClass"
      />

      <label :class="labelClass">周期天数</label>
      <div class="flex items-center gap-1.5 mb-3">
        <button
          v-for="d in CYCLE_OPTIONS" :key="d" @click="form.cycleDays = d"
          class="rounded-xl border text-[11px] px-3 py-1.5 transition-all duration-300 active:scale-[0.98]"
          :class="[dark ? 'border-white/10' : 'border-[#3d4a5c]/15', Number(form.cycleDays) === d ? 'font-medium' : 'opacity-60']"
          :style="Number(form.cycleDays) === d ? { background: accent + '22', borderColor: accent + '66' } : {}"
        >{{ d }} 天</button>
        <input
          v-model.number="form.cycleDays" type="number" min="1" max="999"
          @blur="fmtTitle"
          class="w-20 rounded-xl border text-[11px] px-2.5 py-1.5 focus:outline-none"
          :class="inputClass"
        />
      </div>

      <label :class="labelClass">开始日期</label>
      <div class="mb-3">
        <DateField :model-value="form.startDate" :dark="dark" @update:model-value="form.startDate = $event" />
      </div>

      <!-- 读书：每日目标分钟数 -->
      <template v-if="!isDiet">
        <label :class="labelClass">每日阅读目标（分钟）</label>
        <input
          v-model.number="form.targets.dailyMinutes" type="number" min="1" max="600"
          class="w-full rounded-2xl border text-xs px-3 py-2 mb-1 focus:outline-none transition-all duration-300"
          :class="inputClass"
        />
        <p class="text-[10px] opacity-45 mb-3">只影响卡片与详情页的目标进度条，不限制实际记录</p>
      </template>

      <!-- 减肥：起始/目标体重 + 每日饮水、摄入目标 -->
      <template v-else>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label :class="labelClass">起始体重（kg）</label>
            <input
              v-model.number="form.targets.startWeight" type="number" step="0.1" min="20" max="300"
              class="w-full rounded-2xl border text-xs px-3 py-2 focus:outline-none transition-all duration-300"
              :class="inputClass"
            />
          </div>
          <div>
            <label :class="labelClass">目标体重（kg）</label>
            <input
              v-model.number="form.targets.targetWeight" type="number" step="0.1" min="20" max="300"
              class="w-full rounded-2xl border text-xs px-3 py-2 focus:outline-none transition-all duration-300"
              :class="inputClass"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-1">
          <div>
            <label :class="labelClass">每日摄入目标（kcal）</label>
            <input
              v-model.number="form.targets.intakeGoal" type="number" min="0" max="9999"
              class="w-full rounded-2xl border text-xs px-3 py-2 focus:outline-none transition-all duration-300"
              :class="inputClass"
            />
          </div>
          <div>
            <label :class="labelClass">每日饮水目标（ml）</label>
            <input
              v-model.number="form.targets.waterGoal" type="number" min="0" max="9999"
              class="w-full rounded-2xl border text-xs px-3 py-2 focus:outline-none transition-all duration-300"
              :class="inputClass"
            />
          </div>
        </div>
        <p class="text-[10px] opacity-45 mb-3">运动消耗按「当前体重」算，还没记体重时用起始体重代替</p>
      </template>

      <div class="flex gap-2 mt-1">
        <button
          @click="emit('close')"
          class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
        >取消</button>
        <button
          @click="save"
          class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
        >保存</button>
      </div>
    </div>
  </div>
</template>
