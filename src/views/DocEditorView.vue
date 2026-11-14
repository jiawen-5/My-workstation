<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import RichTextEditor from "../components/editor/RichTextEditor.vue";
import { useNotes } from "../stores/notes.js";

/*
 * 秋招文章页：一篇文章一个节点（note_folder 一行），正文跟着节点走。
 * 富文本编辑器 + 2 秒防抖自动保存；切文章时把没落盘的内容先刷进去。
 */
const props = defineProps({
  dark: Boolean,
  title: { type: String, default: "" },
  dateLine: { type: String, default: "" },
  noteId: { type: Number, required: true },
});

const notes = useNotes();

const html = ref("");
const ready = ref(false);
const missing = ref(false);
const status = ref("idle"); // idle | dirty | saving | saved
const savedAt = ref("");

const breadcrumb = computed(() => ["秋招", ...notes.pathOf(props.noteId)].join(" / "));
const category = computed(() => notes.byId(props.noteId)?.category || "");
const subtitle = computed(() => "内容自动保存在本地数据库，关掉页面也不会丢");
const placeholder = computed(() => `开始写「${props.title}」…`);

const statusText = computed(() => {
  if (status.value === "saving") return "保存中…";
  if (status.value === "dirty") return "2 秒后自动保存";
  if (status.value === "saved") return savedAt.value ? `已保存 ${savedAt.value}` : "已保存";
  return savedAt.value ? `上次保存 ${savedAt.value}` : "还没开始写";
});
const dotClass = computed(() => {
  if (status.value === "saved") return "bg-[#a8c5b8]";
  if (status.value === "dirty" || status.value === "saving") return "bg-[#d4a5a5]";
  return "bg-[#3d4a5c]/25";
});

let timer = null;
let pending = null;
let baseline = ""; // 与库里一致的内容，用来忽略「刚加载完」这类假改动

/* 编辑器初始化时 Tiptap 会给标题补 id / data-toc-id，这种差异不该触发保存 */
const stripTocIds = (html) => String(html || "").replace(/\s(?:id|data-toc-id)="[^"]*"/g, "");

function schedule(v) {
  pending = v;
  status.value = "dirty";
  clearTimeout(timer);
  timer = setTimeout(flush, 2000);
}

async function flush() {
  clearTimeout(timer);
  timer = null;
  if (pending === null) return;
  const next = pending;
  pending = null;
  status.value = "saving";
  savedAt.value = await notes.saveContent(props.noteId, next);
  baseline = next;
  status.value = "saved";
}

watch(html, (v) => {
  if (!ready.value) return;
  // 只是补了 toc id / 属性顺序变化：同步基准，不当成用户编辑
  if (stripTocIds(v) === stripTocIds(baseline)) {
    baseline = v;
    return;
  }
  schedule(v);
});

function flushSoon() {
  if (pending !== null) flush();
}

/* 目录是异步读出来的：等这篇节点到位再灌正文，避免空内容把库里的覆盖掉 */
let stopWaiting = null;
stopWaiting = watch(
  () => notes.byId(props.noteId),
  (node) => {
    if (ready.value || !node) return;
    html.value = node.content || "";
    baseline = node.content || "";
    savedAt.value = node.updatedAt || "";
    ready.value = true;
    stopWaiting?.();
  },
  { immediate: true },
);

onMounted(() => {
  // 目录读完了还是没有这个 id：多半刚被删掉
  setTimeout(() => {
    if (!ready.value) missing.value = true;
  }, 3000);

  document.addEventListener("visibilitychange", flushSoon);
  window.addEventListener("beforeunload", flushSoon);
});

onBeforeUnmount(() => {
  stopWaiting?.();
  document.removeEventListener("visibilitychange", flushSoon);
  window.removeEventListener("beforeunload", flushSoon);
  flushSoon();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-10">
    <div class="flex items-start justify-between gap-3 mb-4">
      <div class="min-w-0">
        <p class="text-[10px] opacity-40 mb-1.5 truncate">{{ breadcrumb }}</p>
        <div class="flex items-center gap-2 min-w-0">
          <h1 class="text-xl md:text-2xl truncate" style="font-family: 'Noto Serif SC', serif">{{ title }}</h1>
          <span
            v-if="category"
            class="shrink-0 rounded-full border text-[10px] px-2 py-0.5 opacity-70"
            :class="dark ? 'border-white/15' : 'border-[#3d4a5c]/15'"
          >
            {{ category }}
          </span>
        </div>
        <p class="text-[11px] md:text-xs opacity-55 mt-1 leading-relaxed">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 text-[10px] opacity-55 pt-1">
        <span class="w-1.5 h-1.5 rounded-full" :class="dotClass"></span>
        <span>{{ statusText }}</span>
      </div>
    </div>

    <div
      class="rounded-2xl border p-5 md:p-6"
      :class="dark ? 'bg-white/[0.03] border-white/10' : 'border-[#3d4a5c]/12'"
    >
      <RichTextEditor v-if="ready" v-model="html" :dark="dark" :placeholder="placeholder" />
      <p v-else-if="missing" class="text-xs opacity-45 py-12 text-center">
        这篇文章已经不在了，可能是刚被删除。<br />
        在左侧「秋招」上右键可以新建文章。
      </p>
      <p v-else class="text-xs opacity-40 py-12 text-center">正在读取本地内容…</p>
    </div>
  </div>
</template>
