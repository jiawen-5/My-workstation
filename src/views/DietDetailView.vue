<script setup>
import { computed, onMounted, ref } from "vue";
import { useLongPlan } from "../stores/longplan.js";
import { DEFAULT_MET, EXERCISES, FOODS, PLAN_META, WATER_STEPS, burnKcal, foodKcal, fmtKg } from "../constants/longplan.js";
import { addDays, bjDateKey, keyLabel, relativeLabel } from "../composables/useDay.js";
import PlanConfigModal from "../components/longplan/PlanConfigModal.vue";

const props = defineProps({ dark: Boolean, dateLine: String });
const emit = defineEmits(["back"]);

const lp = useLongPlan();
onMounted(() => lp.load());

const accent = PLAN_META.diet.accent;
const today = computed(() => bjDateKey());

/* 默认看今天；‹ › 可以翻到以前补录、也能提前填明天 */
const date = ref(bjDateKey());
const isToday = computed(() => date.value === today.value);
const dayHint = computed(() => relativeLabel(date.value, today.value));
function shiftDay(n) {
  date.value = addDays(date.value, n);
}
function goToday() {
  date.value = bjDateKey();
}

const plan = computed(() => lp.planOf("diet"));
const targets = computed(() => plan.value.targets);
const cycle = computed(() => lp.cycleOf("diet"));
const sum = computed(() => lp.dietSummary(date.value));
const currentWeight = computed(() => lp.latestWeight.value);
const startWeight = computed(() => Number(targets.value.startWeight) || 0);
const targetWeight = computed(() => Number(targets.value.targetWeight) || 0);
const waterGoal = computed(() => Number(targets.value.waterGoal) || 2000);
const intakeGoal = computed(() => Number(targets.value.intakeGoal) || 1600);

const lost = computed(() => (currentWeight.value > 0 && startWeight.value > 0 ? Math.round((startWeight.value - currentWeight.value) * 10) / 10 : null));
const toGo = computed(() => (currentWeight.value > 0 && targetWeight.value > 0 ? Math.round((currentWeight.value - targetWeight.value) * 10) / 10 : null));
/* 目标进度：从起始体重走到目标体重完成了百分之多少 */
const goalPercent = computed(() => {
  const total = startWeight.value - targetWeight.value;
  if (total <= 0 || currentWeight.value <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((startWeight.value - currentWeight.value) / total) * 100)));
});

const intakePercent = computed(() => Math.min(100, Math.round((sum.value.intake / intakeGoal.value) * 100)));
const waterPercent = computed(() => Math.min(100, Math.round((sum.value.waterMl / waterGoal.value) * 100)));

/* ---- 饮食：选食物带出每 100g 热量，克数乘出来就是摄入 ---- */
const CUSTOM = "__custom";
const foodPick = ref(FOODS[0].name);
const foodGrams = ref(FOODS[0].portion);
const foodCustom = ref({ name: "", per100: 100 });

const pickedFood = computed(() => FOODS.find((f) => f.name === foodPick.value) || null);
const isCustomFood = computed(() => foodPick.value === CUSTOM);
const foodPer100 = computed(() => (isCustomFood.value ? Number(foodCustom.value.per100) || 0 : pickedFood.value?.kcal || 0));
const foodName = computed(() => (isCustomFood.value ? String(foodCustom.value.name || "").trim() : foodPick.value));
const foodPreview = computed(() => foodKcal(foodPer100.value, foodGrams.value));

function onFoodPick() {
  if (pickedFood.value) foodGrams.value = pickedFood.value.portion;
}

async function addFood() {
  const grams = Number(foodGrams.value) || 0;
  if (!foodName.value || grams <= 0) return;
  await lp.addDiet({ kind: "food", name: foodName.value, amount: grams, kcal: foodPreview.value, bizDate: date.value });
  foodGrams.value = isCustomFood.value ? 100 : pickedFood.value?.portion || 100;
  if (isCustomFood.value) foodCustom.value = { name: "", per100: 100 };
}

/* ---- 饮水：常用杯量一键加，也能自己填 ---- */
const waterInput = ref(250);
async function addWater(ml) {
  const v = Math.round(Number(ml) || 0);
  if (v <= 0) return;
  await lp.addDiet({ kind: "water", name: "饮水", amount: v, bizDate: date.value });
}

/* ---- 运动：MET × 体重 × 时长 ---- */
const sportPick = ref(EXERCISES[0].name);
const sportMinutes = ref(30);
const sportCustom = ref({ name: "", met: DEFAULT_MET });

const pickedSport = computed(() => EXERCISES.find((e) => e.name === sportPick.value) || null);
const isCustomSport = computed(() => sportPick.value === CUSTOM);
const sportMet = computed(() => (isCustomSport.value ? Number(sportCustom.value.met) || DEFAULT_MET : pickedSport.value?.met || DEFAULT_MET));
const sportName = computed(() => (isCustomSport.value ? String(sportCustom.value.name || "").trim() : sportPick.value));
const sportPreview = computed(() => burnKcal(sportMet.value, sportMinutes.value, lp.bodyWeight.value));

async function addSport() {
  const min = Math.round(Number(sportMinutes.value) || 0);
  if (!sportName.value || min <= 0) return;
  await lp.addDiet({
    kind: "exercise",
    name: sportName.value,
    amount: min,
    kcal: sportPreview.value,
    note: `MET ${sportMet.value}`,
    bizDate: date.value,
  });
  if (isCustomSport.value) sportCustom.value = { name: "", met: DEFAULT_MET };
}

/* ---- 体重：一天记多次也没关系，卡片取最新一条 ---- */
const weightInput = ref("");
async function saveWeight() {
  const v = Math.round(Number(weightInput.value) * 10) / 10;
  if (!(v > 0)) return;
  await lp.addDiet({ kind: "weight", name: "体重", amount: v, bizDate: date.value });
  weightInput.value = "";
}

const recentWeights = computed(() => lp.weightLogs.value.slice(0, 8));

async function saveConfig(patch) {
  await lp.savePlan("diet", patch);
}
const showConfig = ref(false);

const boxClass = computed(() => (props.dark ? "border-white/10 bg-white/[0.04]" : "border-[#3d4a5c]/12"));
</script>

<template>
  <div class="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-10">
    <!-- 顶部 -->
    <button
      @click="emit('back')"
      class="inline-flex items-center gap-1.5 rounded-2xl text-xs opacity-60 hover:opacity-100 transition-all duration-300 mb-4 active:scale-[0.98]"
    >
      <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      返回长期计划
    </button>

    <div class="flex items-start justify-between gap-3 mb-5">
      <div class="min-w-0">
        <h1 class="text-xl md:text-2xl truncate" style="font-family: 'Noto Serif SC', serif">{{ plan.title }}</h1>
        <p class="text-[11px] opacity-55 mt-1">
          第 {{ cycle.day }} / {{ cycle.total }} 天 · {{ cycle.overrun ? "周期已结束" : `还剩 ${cycle.left} 天` }} · 记录 {{ date === today ? "今天" : relativeLabel(date, today) }}
        </p>
      </div>
      <button
        @click="showConfig = true"
        class="shrink-0 rounded-2xl border text-xs px-3.5 py-2 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
      >周期 / 目标</button>
    </div>

    <!-- 体重目标 -->
    <div class="rounded-2xl border p-4 mb-4" :class="boxClass">
      <div class="flex items-end justify-between gap-3 mb-2">
        <div class="flex items-end gap-4 flex-wrap">
          <div>
            <p class="text-[10px] opacity-50">当前体重</p>
            <p class="text-lg leading-none mt-1">
              {{ currentWeight > 0 ? fmtKg(currentWeight) : "—" }}
              <span class="text-[10px] opacity-40 ml-1">目标 {{ fmtKg(targetWeight) }}</span>
            </p>
          </div>
          <div class="text-[10px] opacity-55 leading-5">
            <p>起始 {{ fmtKg(startWeight) }}</p>
            <p>
              {{ lost !== null && lost > 0 ? `已减 ${lost} kg` : "尚未减重" }}
              <span class="opacity-40">·</span>
              {{ toGo !== null ? (toGo > 0 ? `还差 ${toGo} kg` : "已达成目标") : "记录体重后显示差距" }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <input
            v-model="weightInput" type="number" step="0.1" min="20" max="300" title="体重" placeholder="今日体重"
            @keydown.enter="saveWeight"
            class="w-24 rounded-xl border text-[11px] px-2.5 py-1.5 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10 placeholder-white/25' : 'border-[#3d4a5c]/15 placeholder-[#3d4a5c]/30'"
          />
          <button
            @click="saveWeight"
            class="rounded-xl text-[11px] px-3 py-1.5 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
          >记录</button>
        </div>
      </div>
      <div class="h-1.5 rounded-full overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
        <div class="h-full rounded-full transition-all duration-500" :style="{ width: goalPercent + '%', background: accent }"></div>
      </div>
      <p class="text-[10px] opacity-40 mt-1.5">减重进度 {{ goalPercent }}%（按起始 → 目标体重算）</p>
    </div>

    <!-- 日期切换 -->
    <div class="flex items-center justify-between gap-3 mb-3">
      <div class="flex items-center gap-1.5">
        <button
          @click="shiftDay(-1)" title="前一天"
          class="w-7 h-7 inline-flex items-center justify-center rounded-xl border transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/12 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6"><path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <span class="text-[11px] opacity-70 px-1">{{ keyLabel(date) }}</span>
        <button
          @click="shiftDay(1)" title="后一天"
          class="w-7 h-7 inline-flex items-center justify-center rounded-xl border transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/12 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6"><path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <button
          v-if="!isToday" @click="goToday()"
          class="h-7 rounded-xl border text-[11px] px-2.5 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'"
        >回到今天</button>
      </div>
      <p class="text-[10px] opacity-45">{{ dayHint }}</p>
    </div>

    <!-- 当日汇总 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">摄入</p>
        <p class="text-sm mt-0.5">{{ sum.intake }} <span class="text-[10px] opacity-40">/ {{ intakeGoal }} kcal</span></p>
        <div class="h-1 rounded-full mt-2 overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
          <div class="h-full rounded-full" :style="{ width: intakePercent + '%', background: accent }"></div>
        </div>
      </div>
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">运动消耗</p>
        <p class="text-sm mt-0.5">{{ sum.burn }} <span class="text-[10px] opacity-40">kcal</span></p>
        <p class="text-[9px] opacity-40 mt-1.5">{{ sum.sport.length }} 条运动 · 按 {{ lp.bodyWeight.value }} kg 估</p>
      </div>
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">净摄入</p>
        <p class="text-sm mt-0.5">{{ sum.net }} <span class="text-[10px] opacity-40">kcal</span></p>
        <p class="text-[9px] opacity-40 mt-1.5">摄入 − 消耗</p>
      </div>
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">饮水</p>
        <p class="text-sm mt-0.5">{{ sum.waterMl }} <span class="text-[10px] opacity-40">/ {{ waterGoal }} ml</span></p>
        <div class="h-1 rounded-full mt-2 overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
          <div class="h-full rounded-full" :style="{ width: waterPercent + '%', background: '#a8c5b8' }"></div>
        </div>
      </div>
    </div>

    <!-- 饮食 -->
    <div class="rounded-2xl border p-4 mb-4" :class="boxClass">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs" style="font-family: 'Noto Serif SC', serif">饮食</p>
        <p class="text-[10px] opacity-45">食物 × 克数自动算热量</p>
      </div>

      <div class="flex flex-wrap items-end gap-2 mb-3">
        <div class="min-w-0 flex-1">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">食物</label>
          <select
            v-model="foodPick" @change="onFoodPick"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
          >
            <option v-for="f in FOODS" :key="f.name" :value="f.name">{{ f.name }} · {{ f.kcal }} kcal/100g</option>
            <option :value="CUSTOM">自定义食物…</option>
          </select>
        </div>
        <div v-if="isCustomFood" class="w-32">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">名称</label>
          <input
            v-model="foodCustom.name" type="text" maxlength="12" placeholder="食物名"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10 placeholder-white/25' : 'border-[#3d4a5c]/15 placeholder-[#3d4a5c]/30'"
          />
        </div>
        <div v-if="isCustomFood" class="w-24">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">kcal/100g</label>
          <input
            v-model.number="foodCustom.per100" type="number" min="0" max="900" title="每100g热量"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
          />
        </div>
        <div class="w-24">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">克数</label>
          <input
            v-model.number="foodGrams" type="number" min="1" max="5000" title="克数"
            @keydown.enter="addFood"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
          />
        </div>
        <div class="w-24">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">≈ 热量</label>
          <div class="rounded-xl border text-[11px] px-2.5 py-2 tabular-nums" :class="dark ? 'border-white/10 bg-white/[0.02]' : 'border-[#3d4a5c]/12 bg-[#3d4a5c]/[0.03]'">
            {{ foodPreview }} kcal
          </div>
        </div>
        <button
          @click="addFood"
          class="rounded-xl text-[11px] px-4 py-2 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
        >添加</button>
      </div>

      <p v-if="!sum.food.length" class="text-[11px] opacity-40 rounded-xl border border-dashed py-4 text-center" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'">
        这天还没有饮食记录
      </p>
      <div v-else class="space-y-1">
        <div
          v-for="l in sum.food" :key="l.id"
          class="group flex items-center gap-2 rounded-xl px-2.5 py-1.5"
          :class="dark ? 'hover:bg-white/5' : 'hover:bg-[#3d4a5c]/[0.04]'"
        >
          <span class="text-[11px] flex-1 truncate">{{ l.name }}</span>
          <span class="text-[10px] opacity-45 tabular-nums shrink-0">{{ l.amount }} g</span>
          <span class="text-[11px] tabular-nums shrink-0 w-16 text-right" :style="{ color: accent }">{{ l.kcal }} kcal</span>
          <span class="text-[9px] opacity-30 shrink-0 w-9 text-right">{{ (l.at || "").slice(11) }}</span>
          <button @click="lp.removeDiet(l.id)" class="w-5 h-5 shrink-0 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px]" :class="dark ? 'hover:bg-white/10' : 'hover:bg-[#3d4a5c]/10'">✕</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <!-- 饮水 -->
      <div class="rounded-2xl border p-4" :class="boxClass">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs" style="font-family: 'Noto Serif SC', serif">饮水</p>
          <p class="text-[10px] opacity-45">{{ sum.waterMl }} / {{ waterGoal }} ml</p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            v-for="s in WATER_STEPS" :key="s" @click="addWater(s)"
            class="rounded-xl border text-[11px] px-3 py-1.5 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'border-white/10 hover:bg-white/8' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
          >+{{ s }} ml</button>
          <input
            v-model.number="waterInput" type="number" min="1" max="5000" title="饮水毫升"
            class="w-20 rounded-xl border text-[11px] px-2.5 py-1.5 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
          />
          <button
            @click="addWater(waterInput)"
            class="rounded-xl text-[11px] px-3 py-1.5 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
          >加</button>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden mb-2" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
          <div class="h-full rounded-full transition-all duration-500" :style="{ width: waterPercent + '%', background: '#a8c5b8' }"></div>
        </div>
        <p v-if="!sum.water.length" class="text-[10px] opacity-35">还没有饮水记录</p>
        <div v-else class="flex flex-wrap gap-1">
          <span
            v-for="l in sum.water" :key="l.id"
            class="group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px]"
            :class="dark ? 'bg-white/6' : 'bg-[#3d4a5c]/[0.05]'"
          >
            {{ l.amount }} ml
            <button @click="lp.removeDiet(l.id)" class="opacity-30 hover:opacity-90 text-[9px]">✕</button>
          </span>
        </div>
      </div>

      <!-- 运动 -->
      <div class="rounded-2xl border p-4" :class="boxClass">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs" style="font-family: 'Noto Serif SC', serif">运动</p>
          <p class="text-[10px] opacity-45">MET × {{ lp.bodyWeight.value }} kg × 时长</p>
        </div>
        <div class="flex flex-wrap items-end gap-2 mb-3">
          <div class="min-w-0 flex-1">
            <select
              v-model="sportPick"
              class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
              :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
            >
              <option v-for="e in EXERCISES" :key="e.name" :value="e.name">{{ e.name }} · MET {{ e.met }}</option>
              <option :value="CUSTOM">自定义运动…</option>
            </select>
          </div>
          <div v-if="isCustomSport" class="w-28">
            <input
              v-model="sportCustom.name" type="text" maxlength="12" placeholder="运动名"
              class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
              :class="dark ? 'bg-white/5 border-white/10 placeholder-white/25' : 'border-[#3d4a5c]/15 placeholder-[#3d4a5c]/30'"
            />
          </div>
          <div v-if="isCustomSport" class="w-20">
            <input
              v-model.number="sportCustom.met" type="number" step="0.1" min="1" max="20" title="MET" placeholder="MET"
              class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
              :class="dark ? 'bg-white/5 border-white/10 placeholder-white/25' : 'border-[#3d4a5c]/15 placeholder-[#3d4a5c]/30'"
            />
          </div>
          <div class="w-20">
            <input
              v-model.number="sportMinutes" type="number" min="1" max="600" title="运动时长" placeholder="分钟"
              @keydown.enter="addSport"
              class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none"
              :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
            />
          </div>
          <button
            @click="addSport"
            class="rounded-xl text-[11px] px-3.5 py-2 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
          >添加 {{ sportPreview }} kcal</button>
        </div>
        <p v-if="!sum.sport.length" class="text-[10px] opacity-35">这天还没有运动记录</p>
        <div v-else class="space-y-1">
          <div
            v-for="l in sum.sport" :key="l.id"
            class="group flex items-center gap-2 rounded-xl px-2.5 py-1.5"
            :class="dark ? 'hover:bg-white/5' : 'hover:bg-[#3d4a5c]/[0.04]'"
          >
            <span class="text-[11px] flex-1 truncate">{{ l.name }}</span>
            <span class="text-[10px] opacity-45 tabular-nums shrink-0">{{ l.amount }} 分钟</span>
            <span class="text-[11px] tabular-nums shrink-0 w-16 text-right" :style="{ color: accent }">−{{ l.kcal }} kcal</span>
            <button @click="lp.removeDiet(l.id)" class="w-5 h-5 shrink-0 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px]" :class="dark ? 'hover:bg-white/10' : 'hover:bg-[#3d4a5c]/10'">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 体重记录 -->
    <div class="rounded-2xl border p-4" :class="boxClass">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs" style="font-family: 'Noto Serif SC', serif">体重记录</p>
        <p class="text-[10px] opacity-45">最近 {{ recentWeights.length }} 条</p>
      </div>
      <p v-if="!recentWeights.length" class="text-[10px] opacity-35">还没有体重记录，在上面输入框填一个就能开始追踪</p>
      <div v-else class="flex flex-wrap gap-1.5">
        <span
          v-for="l in recentWeights" :key="l.id"
          class="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px]"
          :class="dark ? 'bg-white/6' : 'bg-[#3d4a5c]/[0.05]'"
        >
          <span class="opacity-45">{{ l.bizDate.slice(5) }}</span>
          <span class="tabular-nums">{{ l.amount }} kg</span>
          <button @click="lp.removeDiet(l.id)" class="opacity-30 hover:opacity-90 text-[9px]">✕</button>
        </span>
      </div>
    </div>

    <p class="text-[10px] opacity-35 mt-4 pl-1">
      热量与消耗都是估算值：食物按常见每 100g 均值，运动按 MET 折算体重，只用来盯趋势
    </p>

    <PlanConfigModal
      :dark="dark" :open="showConfig" kind="diet" :plan="plan"
      @close="showConfig = false" @save="saveConfig"
    />
  </div>
</template>
