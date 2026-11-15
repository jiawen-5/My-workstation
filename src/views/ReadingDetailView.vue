<script setup>
import { computed, onMounted, ref } from "vue";
import { useLongPlan } from "../stores/longplan.js";
import { MAX_TXT_BYTES, PLAN_META, fmtMinutes } from "../constants/longplan.js";
import { bjDateKey, keyShortLabel, relativeLabel } from "../composables/useDay.js";
import PlanConfigModal from "../components/longplan/PlanConfigModal.vue";

const props = defineProps({ dark: Boolean, dateLine: String });
const emit = defineEmits(["back"]);

const lp = useLongPlan();
onMounted(() => lp.load());

const accent = PLAN_META.reading.accent;
const today = computed(() => bjDateKey());

const plan = computed(() => lp.planOf("reading"));
const cycle = computed(() => lp.cycleOf("reading"));
const goal = computed(() => Number(plan.value.targets.dailyMinutes) || 30);
const todayMinutes = computed(() => lp.minutesOn(today.value));
const total = computed(() => lp.totalMinutes.value);
const week = computed(() => lp.recentDays(7));
const weekTotal = computed(() => week.value.reduce((n, d) => n + d.minutes, 0));
const best = computed(() => Math.max(goal.value, ...week.value.map((d) => d.minutes), 1));
const goalPercent = computed(() => Math.min(100, Math.round((todayMinutes.value / goal.value) * 100)));

const boxClass = computed(() => (props.dark ? "border-white/10 bg-white/[0.04]" : "border-[#3d4a5c]/12"));
const inputClass = computed(() =>
  props.dark
    ? "bg-white/5 border-white/10 placeholder-white/25"
    : "border-[#3d4a5c]/15 placeholder-[#3d4a5c]/30",
);

/* ---- 新增书目 ---- */
const bookForm = ref({ title: "", author: "" });
async function addBook() {
  const row = await lp.addBook(bookForm.value);
  if (!row) return;
  bookForm.value = { title: "", author: "" };
  if (!logForm.value.bookId) logForm.value.bookId = row.id;
}
const removeBook = async (book) => {
  if (!confirm(`删除《${book.title}》？阅读记录会保留，只是不再挂在这本书上。`)) return;
  await lp.removeBook(book);
};

/* ---- 上传 txt：一个隐藏 input 复用，要上传的书 id 记在 dataset 上 ---- */
const fileInput = ref(null);
const notice = ref("");

function pickFile(book) {
  const el = fileInput.value;
  if (!el) return;
  notice.value = "";
  el.dataset.bookId = String(book.id);
  el.click();
}

async function onFilePicked(e) {
  const input = e.target;
  const file = input.files && input.files[0];
  input.value = ""; // 允许连续选同一个文件
  const id = Number(input.dataset.bookId || 0);
  input.dataset.bookId = "";
  if (!file) return;
  if (!/\.txt$/i.test(file.name)) {
    notice.value = "只支持 .txt 文本文件";
    return;
  }
  if (file.size > MAX_TXT_BYTES) {
    notice.value = `文件 ${(file.size / 1024 / 1024).toFixed(1)}MB，超过 5MB 建议先拆分`;
    return;
  }
  const book = lp.books.value.find((b) => b.id === id);
  if (!book) return;
  const text = await file.text();
  const updated = await lp.uploadText(book, text);
  notice.value = `《${updated.title}》已上传 ${file.name} · ${(updated.charCount / 10000).toFixed(1)} 万字`;
}

/* 阅读器：正文按需从库里取，不进列表查询 */
const reader = ref({ open: false, book: null, text: "", loading: false });
async function openReader(book) {
  reader.value = { open: true, book, text: "", loading: true };
  const text = await lp.readText(book.id);
  reader.value = { open: true, book, text, loading: false };
}
const hasText = (book) => book.charCount > 0;

/* ---- 记阅读时长 ---- */
const logForm = ref({ bookId: 0, minutes: 30, pages: 0, note: "" });
const bookOptions = computed(() => lp.books.value);
const activeBook = computed(() => lp.books.value.find((b) => b.id === logForm.value.bookId) || null);

async function addLog() {
  const min = Math.round(Number(logForm.value.minutes) || 0);
  if (min <= 0) return;
  const book = activeBook.value;
  await lp.addReading({
    bookId: book ? book.id : null,
    minutes: min,
    pages: Number(logForm.value.pages) || 0,
    note: logForm.value.note,
  });
  logForm.value = { bookId: logForm.value.bookId, minutes: 30, pages: 0, note: "" };
}

const recentLogs = computed(() =>
  [...lp.readingLogs.value].sort((a, b) => `${b.bizDate}${b.at}`.localeCompare(`${a.bizDate}${a.at}`)).slice(0, 12),
);

async function setProgress(book, value) {
  const p = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  if (p === book.progress) return;
  await lp.patchBook(book, { progress: p, status: p >= 100 ? "done" : "reading" });
}
async function toggleDone(book) {
  const done = book.status !== "done";
  await lp.patchBook(book, { status: done ? "done" : "reading", progress: done ? 100 : Math.min(book.progress, 95) });
}

const showConfig = ref(false);
const saveConfig = (patch) => lp.savePlan("reading", patch);

const fmtWan = (n) => `${((Number(n) || 0) / 10000).toFixed(1)} 万字`;
</script>

<template>
  <div class="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-10">
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
          第 {{ cycle.day }} / {{ cycle.total }} 天 · {{ keyShortLabel(cycle.startDate) }} 起（{{ relativeLabel(cycle.startDate, today) }}）· 在读 {{ lp.activeBooks.value.length }} 本
        </p>
      </div>
      <button
        @click="showConfig = true"
        class="shrink-0 rounded-2xl border text-xs px-3.5 py-2 opacity-70 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
      >周期 / 目标</button>
    </div>

    <!-- 汇总 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">今日阅读</p>
        <p class="text-sm mt-0.5">{{ todayMinutes }} <span class="text-[10px] opacity-40">/ {{ goal }} 分钟</span></p>
        <div class="h-1 rounded-full mt-2 overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
          <div class="h-full rounded-full transition-all duration-500" :style="{ width: goalPercent + '%', background: accent }"></div>
        </div>
      </div>
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">近 7 天</p>
        <p class="text-sm mt-0.5 truncate">{{ fmtMinutes(weekTotal) }}</p>
        <div class="flex items-end gap-0.5 h-4 mt-1.5">
          <div
            v-for="d in week" :key="d.key" class="flex-1 rounded-sm"
            :style="{ height: Math.max(2, (d.minutes / best) * 16) + 'px', background: accent, opacity: d.minutes ? 0.75 : 0.18 }"
          ></div>
        </div>
      </div>
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">累计时长</p>
        <p class="text-sm mt-0.5 truncate">{{ fmtMinutes(total) }}</p>
        <p class="text-[9px] opacity-40 mt-1.5">{{ lp.readingLogs.value.length }} 条记录</p>
      </div>
      <div class="rounded-2xl border p-3" :class="boxClass">
        <p class="text-[10px] opacity-50">书单</p>
        <p class="text-sm mt-0.5">{{ lp.activeBooks.value.length }} 在读 <span class="text-[10px] opacity-40">/ {{ lp.doneBooks.value.length }} 读完</span></p>
        <p class="text-[9px] opacity-40 mt-1.5">共 {{ lp.books.value.length }} 本</p>
      </div>
    </div>

    <!-- 记录阅读 -->
    <div class="rounded-2xl border p-4 mb-4" :class="boxClass">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs" style="font-family: 'Noto Serif SC', serif">记阅读时长</p>
        <p class="text-[10px] opacity-45">默认记到「今天」</p>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <div class="min-w-0 flex-1">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">书目</label>
          <select v-model.number="logForm.bookId" class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none" :class="inputClass">
            <option :value="0">不指定书目</option>
            <option v-for="b in bookOptions" :key="b.id" :value="b.id">{{ b.title }}</option>
          </select>
        </div>
        <div class="w-24">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">分钟</label>
          <input v-model.number="logForm.minutes" type="number" min="1" max="1440" title="阅读分钟" @keydown.enter="addLog"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none" :class="inputClass" />
        </div>
        <div class="w-24">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">页数（可选）</label>
          <input v-model.number="logForm.pages" type="number" min="0" max="5000" title="页数"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none" :class="inputClass" />
        </div>
        <div class="min-w-0 flex-1">
          <label class="text-[10px] opacity-50 pl-1 mb-1 block">备注（可选）</label>
          <input v-model="logForm.note" type="text" maxlength="40" title="阅读备注" placeholder="读到哪一章…"
            class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none" :class="inputClass" />
        </div>
        <button
          @click="addLog"
          class="rounded-xl text-[11px] px-4 py-2 transition-all duration-300 active:scale-[0.98]"
          :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
        >记录</button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <!-- 书单 -->
      <div class="lg:col-span-3 rounded-2xl border p-4" :class="boxClass">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs" style="font-family: 'Noto Serif SC', serif">书单</p>
          <p class="text-[10px] opacity-45">支持上传 txt</p>
        </div>

        <div class="flex flex-wrap items-end gap-2 mb-3">
          <div class="min-w-0 flex-1">
            <input v-model="bookForm.title" type="text" maxlength="40" placeholder="书名"
              @keydown.enter="addBook"
              class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none" :class="inputClass" />
          </div>
          <div class="w-28">
            <input v-model="bookForm.author" type="text" maxlength="20" placeholder="作者"
              class="w-full rounded-xl border text-[11px] px-2.5 py-2 focus:outline-none" :class="inputClass" />
          </div>
          <button
            @click="addBook"
            class="rounded-xl text-[11px] px-3.5 py-2 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
          >加入书单</button>
        </div>

        <p v-if="notice" class="text-[10px] mb-2 pl-1" :style="{ color: accent }">{{ notice }}</p>

        <p v-if="!lp.books.value.length" class="text-[11px] opacity-40 rounded-xl border border-dashed py-6 text-center" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'">
          还没有书，先加一本
        </p>

        <div v-else class="space-y-2">
          <div
            v-for="b in lp.books.value" :key="b.id"
            class="group rounded-xl border px-3 py-2.5 transition-all duration-300"
            :class="dark ? 'border-white/10 hover:bg-white/[0.04]' : 'border-[#3d4a5c]/12 hover:bg-[#3d4a5c]/[0.03]'"
          >
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[11px] truncate" :class="b.status === 'done' ? 'line-through opacity-50' : ''">{{ b.title }}</span>
                  <span v-if="b.author" class="text-[9px] opacity-40 truncate">{{ b.author }}</span>
                  <span
                    v-if="hasText(b)" class="text-[9px] rounded-full px-1.5 py-0.5"
                    :style="{ background: accent + '22', color: accent }"
                  >txt · {{ fmtWan(b.charCount) }}</span>
                </div>
                <p class="text-[9px] opacity-40 mt-1">
                  累计 {{ fmtMinutes(lp.bookMinutes(b.id)) }}
                  <span class="opacity-50">·</span>
                  {{ b.progress }}%
                  <span class="opacity-50">·</span>
                  {{ b.status === "done" ? "已读完" : "在读" }}
                </p>
                <div class="h-1 rounded-full mt-1.5 overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-[#3d4a5c]/10'">
                  <div class="h-full rounded-full transition-all duration-500" :style="{ width: b.progress + '%', background: accent }"></div>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <input
                  :value="b.progress" type="number" min="0" max="100" title="阅读进度 %"
                  @change="setProgress(b, $event.target.value)"
                  class="w-12 rounded-lg border text-[10px] px-1.5 py-1 text-center focus:outline-none"
                  :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
                />
                <button
                  @click="pickFile(b)" title="上传 txt"
                  class="rounded-lg border text-[10px] px-2 py-1 opacity-60 hover:opacity-100 transition-all duration-300"
                  :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
                >{{ hasText(b) ? "换 txt" : "上传" }}</button>
                <button
                  v-if="hasText(b)" @click="openReader(b)" title="查看正文"
                  class="rounded-lg border text-[10px] px-2 py-1 opacity-60 hover:opacity-100 transition-all duration-300"
                  :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
                >查看</button>
                <button
                  @click="toggleDone(b)" title="标记读完 / 撤回"
                  class="rounded-lg border text-[10px] px-2 py-1 opacity-60 hover:opacity-100 transition-all duration-300"
                  :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
                >{{ b.status === "done" ? "撤回" : "读完" }}</button>
                <button
                  @click="removeBook(b)" title="删除"
                  class="w-6 h-6 rounded-lg text-[10px] opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-all duration-300"
                  :class="dark ? 'hover:bg-white/10' : 'hover:bg-[#3d4a5c]/10'"
                >✕</button>
              </div>
            </div>
          </div>
        </div>

        <input ref="fileInput" type="file" accept=".txt,text/plain" class="hidden" @change="onFilePicked" />
      </div>

      <!-- 阅读记录 -->
      <div class="lg:col-span-2 rounded-2xl border p-4" :class="boxClass">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs" style="font-family: 'Noto Serif SC', serif">最近记录</p>
          <p class="text-[10px] opacity-45">{{ lp.readingLogs.value.length }} 条</p>
        </div>
        <p v-if="!recentLogs.length" class="text-[11px] opacity-40 rounded-xl border border-dashed py-6 text-center" :class="dark ? 'border-white/12' : 'border-[#3d4a5c]/15'">
          还没有阅读记录
        </p>
        <div v-else class="space-y-1">
          <div
            v-for="l in recentLogs" :key="l.id"
            class="group flex items-center gap-2 rounded-xl px-2 py-1.5"
            :class="dark ? 'hover:bg-white/5' : 'hover:bg-[#3d4a5c]/[0.04]'"
          >
            <span class="text-[9px] opacity-35 tabular-nums shrink-0 w-9">{{ l.bizDate.slice(5) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-[11px] truncate">{{ l.bookTitle }}</p>
              <p v-if="l.note || l.pages" class="text-[9px] opacity-40 truncate">
                {{ l.pages ? `${l.pages} 页` : "" }}{{ l.pages && l.note ? " · " : "" }}{{ l.note }}
              </p>
            </div>
            <span class="text-[11px] tabular-nums shrink-0" :style="{ color: accent }">{{ l.minutes }} 分钟</span>
            <button @click="lp.removeReading(l.id)" class="w-5 h-5 shrink-0 rounded-lg opacity-0 group-hover:opacity-50 hover:!opacity-90 text-[10px]" :class="dark ? 'hover:bg-white/10' : 'hover:bg-[#3d4a5c]/10'">✕</button>
          </div>
        </div>
      </div>
    </div>

    <p class="text-[10px] opacity-35 mt-4 pl-1">上传的 txt 存在本地 SQLite，只有点「查看」时才会读取正文</p>

    <!-- 阅读器 -->
    <div v-if="reader.open" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(61, 74, 92, 0.32)" @click.self="reader.open = false">
      <div class="w-full max-w-2xl h-[78vh] rounded-2xl border shadow-sm flex flex-col overflow-hidden" :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'">
        <div class="flex items-center gap-3 px-5 py-3 border-b shrink-0" :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/10'">
          <div class="min-w-0 flex-1">
            <p class="text-sm truncate" style="font-family: 'Noto Serif SC', serif">{{ reader.book?.title }}</p>
            <p class="text-[10px] opacity-45 mt-0.5">{{ fmtWan(reader.book?.charCount) }} · 进度 {{ reader.book?.progress }}%</p>
          </div>
          <button
            @click="reader.open = false"
            class="rounded-xl border text-[11px] px-3 py-1.5 opacity-70 hover:opacity-100 transition-all duration-300"
            :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
          >关闭</button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <p v-if="reader.loading" class="text-[11px] opacity-45">读取中…</p>
          <p v-else-if="!reader.text" class="text-[11px] opacity-45">这本书还没有上传正文</p>
          <pre v-else class="text-[12px] leading-7 whitespace-pre-wrap break-words font-normal" style="font-family: 'Noto Serif SC', serif">{{ reader.text }}</pre>
        </div>
      </div>
    </div>

    <PlanConfigModal
      :dark="dark" :open="showConfig" kind="reading" :plan="plan"
      @close="showConfig = false" @save="saveConfig"
    />
  </div>
</template>
