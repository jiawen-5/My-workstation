<script setup>
/*
 * 编辑器按钮组：顶部工具条和选中文字的浮动工具条共用这一份，
 * 选中文字后点 H1/H2/H3 就是「一键设置标题」。
 */
const props = defineProps({ editor: { type: Object, required: true } });

const actions = [
  { key: "h1", text: "H1", title: "一级标题", run: (c) => c.toggleHeading({ level: 1 }), on: (e) => e.isActive("heading", { level: 1 }) },
  { key: "h2", text: "H2", title: "二级标题", run: (c) => c.toggleHeading({ level: 2 }), on: (e) => e.isActive("heading", { level: 2 }) },
  { key: "h3", text: "H3", title: "三级标题", run: (c) => c.toggleHeading({ level: 3 }), on: (e) => e.isActive("heading", { level: 3 }) },
  { key: "p", text: "正文", title: "恢复成正文", run: (c) => c.setParagraph(), on: (e) => e.isActive("paragraph") },
  { key: "bold", text: "B", title: "加粗 (Ctrl+B)", run: (c) => c.toggleBold(), on: (e) => e.isActive("bold") },
  { key: "italic", text: "I", title: "斜体 (Ctrl+I)", run: (c) => c.toggleItalic(), on: (e) => e.isActive("italic") },
  { key: "ul", text: "•", title: "无序列表", run: (c) => c.toggleBulletList(), on: (e) => e.isActive("bulletList") },
  { key: "ol", text: "1.", title: "有序列表", run: (c) => c.toggleOrderedList(), on: (e) => e.isActive("orderedList") },
  { key: "quote", text: "引", title: "引用", run: (c) => c.toggleBlockquote(), on: (e) => e.isActive("blockquote") },
  { key: "hr", text: "—", title: "分割线", run: (c) => c.setHorizontalRule(), on: () => false },
];
</script>

<template>
  <div class="rte-tools">
    <button
      v-for="a in actions"
      :key="a.key"
      type="button"
      :title="a.title"
      class="rte-btn"
      :class="[`is-${a.key}`, { on: a.on(editor) }]"
      @mousedown.prevent
      @click="a.run(editor.chain().focus()).run()"
    >{{ a.text }}</button>
  </div>
</template>

<style scoped>
.rte-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.rte-btn {
  min-width: 26px;
  height: 26px;
  padding: 0 5px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--rte-muted);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.rte-btn:hover {
  background: var(--rte-hover);
  color: var(--rte-fg);
}

.rte-btn.on {
  background: var(--rte-accent-soft);
  color: var(--rte-fg);
}

.rte-btn.is-p {
  font-size: 10px;
  padding: 0 7px;
}

.rte-btn.is-bold {
  font-weight: 700;
  font-size: 12px;
}

.rte-btn.is-italic {
  font-style: italic;
  font-family: Georgia, serif;
  font-size: 12px;
}

.rte-btn.is-ul {
  font-size: 14px;
}

.rte-btn.is-ol {
  font-size: 11px;
}

.rte-btn.is-quote {
  font-size: 10px;
}
</style>
