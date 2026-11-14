<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TableOfContents } from "@tiptap/extension-table-of-contents";
import EditorToolbar from "./EditorToolbar.vue";
import TocFloating from "./TocFloating.vue";

/*
 * 可复用的富文本编辑器：
 * - v-model 双向绑定 HTML（父级拿去存 SQLite）
 * - 选中文字浮出工具条；顶部常驻一排同样的按钮，方便设分割线、切标题
 * - TableOfContents 扩展生成大纲，数据交给右下角的悬浮球弹窗
 */
const props = defineProps({
  modelValue: { type: String, default: "" },
  dark: Boolean,
  placeholder: { type: String, default: "从这里开始写，选中文字可以设成标题…" },
});
const emit = defineEmits(["update:modelValue"]);

const root = ref(null);
const toc = shallowRef([]); // [{ id, level, text, dom }]
const activeId = ref("");
const scrollHost = ref(null);

const editor = useEditor({
  content: props.modelValue || "",
  editorProps: { attributes: { class: "rte-content", spellcheck: "false" } },
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Placeholder.configure({ placeholder: props.placeholder }),
    TableOfContents.configure({
      onUpdate: (items) => {
        toc.value = items.map((i) => ({ id: i.id, level: i.level, text: i.textContent || "未命名标题", dom: i.dom }));
        spy();
      },
    }),
  ],
  onUpdate: ({ editor: ed }) => {
    emit("update:modelValue", ed.getHTML());
    spy();
  },
});

/* 滚动高亮：找到离顶部最近的那个已越过的标题 */
let raf = 0;
function spy() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const items = toc.value;
    if (!items.length) {
      activeId.value = "";
      return;
    }
    const host = scrollHost.value;
    const hostTop = host && host !== window ? host.getBoundingClientRect().top : 0;
    let id = items[0].id;
    for (const it of items) {
      if (it.dom.getBoundingClientRect().top - hostTop <= 88) id = it.id;
      else break;
    }
    activeId.value = id;
  });
}

function findScrollHost(el) {
  let node = el?.parentElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") return node;
    node = node.parentElement;
  }
  return window;
}

function jump(item) {
  item.dom?.scrollIntoView({ behavior: "smooth", block: "start" });
  activeId.value = item.id;
}

/* 父级异步从库里读到内容后回填；自己敲的字不回灌，避免光标乱跳 */
watch(
  () => props.modelValue,
  (v) => {
    const ed = editor.value;
    if (!ed) return;
    const html = v || "";
    if (html === ed.getHTML()) return;
    ed.commands.setContent(html, { emitUpdate: false });
    spy();
  },
);

onMounted(() => {
  scrollHost.value = findScrollHost(root.value);
  scrollHost.value?.addEventListener?.("scroll", spy, { passive: true });
  spy();
});

onBeforeUnmount(() => {
  scrollHost.value?.removeEventListener?.("scroll", spy);
  if (raf) cancelAnimationFrame(raf);
});
</script>

<template>
  <div ref="root" class="rte" :class="{ 'is-dark': dark }">
    <div class="rte-bar">
      <EditorToolbar v-if="editor" :editor="editor" />
      <span class="rte-tip">选中文字可一键设为标题</span>
    </div>

    <EditorContent :editor="editor" />

    <BubbleMenu v-if="editor" :editor="editor" :options="{ placement: 'top', offset: 10 }">
      <div class="rte-bubble">
        <EditorToolbar :editor="editor" />
      </div>
    </BubbleMenu>

    <TocFloating :items="toc" :active-id="activeId" :dark="dark" :anchor="root" @jump="jump" />
  </div>
</template>

<style>
.rte {
  --rte-fg: #3d4a5c;
  --rte-muted: rgba(61, 74, 92, 0.55);
  --rte-border: rgba(61, 74, 92, 0.15);
  --rte-hover: rgba(61, 74, 92, 0.07);
  --rte-panel: rgba(250, 249, 247, 0.94);
  --rte-accent: #c99a9a;
  --rte-accent-soft: rgba(212, 165, 165, 0.22);
}

.rte.is-dark {
  --rte-fg: #ece8e1;
  --rte-muted: rgba(236, 232, 225, 0.5);
  --rte-border: rgba(255, 255, 255, 0.12);
  --rte-hover: rgba(255, 255, 255, 0.07);
  --rte-panel: rgba(46, 52, 64, 0.94);
  --rte-accent: #d4a5a5;
  --rte-accent-soft: rgba(212, 165, 165, 0.2);
}

.rte-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--rte-border);
}

.rte-tip {
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--rte-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 内容区被右侧时间轴挤窄时，提示语让位给按钮 */
@media (max-width: 1280px) {
  .rte-tip {
    display: none;
  }
}

.rte-bubble {
  display: flex;
  align-items: center;
  padding: 4px;
  border: 1px solid var(--rte-border);
  border-radius: 12px;
  background: var(--rte-panel);
  box-shadow: 0 8px 24px rgba(61, 74, 92, 0.16);
  backdrop-filter: blur(10px);
}

/* ---- 正文排版：原生 CSS，不依赖 Tailwind 的 prose ---- */
.rte-content {
  min-height: 56vh;
  padding: 2px 2px 34vh;
  outline: none;
  color: var(--rte-fg);
  caret-color: var(--rte-accent);
  font-size: 13.5px;
  line-height: 1.95;
  word-break: break-word;
}

.rte-content ::selection {
  background: var(--rte-accent-soft);
}

.rte-content > * + * {
  margin-top: 0.6em;
}

.rte-content p {
  margin: 0;
}

.rte-content h1,
.rte-content h2,
.rte-content h3 {
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-weight: 600;
  line-height: 1.45;
  color: var(--rte-fg);
  scroll-margin-top: 18px;
}

.rte-content h1 {
  margin-top: 1.5em;
  font-size: 1.45rem;
  padding-bottom: 0.28em;
  border-bottom: 1px solid var(--rte-border);
}

.rte-content h2 {
  margin-top: 1.25em;
  font-size: 1.16rem;
}

.rte-content h3 {
  margin-top: 1.05em;
  font-size: 1rem;
  color: var(--rte-muted);
}

.rte-content h1:first-child,
.rte-content h2:first-child,
.rte-content h3:first-child {
  margin-top: 0.1em;
}

.rte-content ul,
.rte-content ol {
  padding-left: 1.35em;
}

.rte-content li + li {
  margin-top: 0.2em;
}

.rte-content li p {
  margin: 0;
}

.rte-content ul {
  list-style: disc;
}

.rte-content ol {
  list-style: decimal;
}

.rte-content blockquote {
  margin: 0.9em 0;
  padding: 0.15em 0 0.15em 0.85em;
  border-left: 2px solid var(--rte-accent);
  color: var(--rte-muted);
}

.rte-content hr {
  margin: 1.6em 0;
  border: 0;
  border-top: 1px solid var(--rte-border);
}

.rte-content code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--rte-hover);
  font-size: 0.9em;
  font-family: "JetBrains Mono", Consolas, monospace;
}

.rte-content pre {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--rte-hover);
  overflow-x: auto;
}

.rte-content pre code {
  padding: 0;
  background: none;
}

.rte-content strong {
  font-weight: 600;
}

.rte-content a {
  color: var(--rte-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rte-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  opacity: 0.35;
}
</style>
