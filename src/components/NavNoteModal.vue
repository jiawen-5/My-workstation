<script setup>
import { computed, reactive, watch } from "vue";
import { NOTE_CATEGORIES } from "../constants/nav.js";

/*
 * 秋招文章目录的三个弹窗，共用一个壳：
 *   create → 填文章名称 + 分类（分类可下拉选，也可手输自定义）
 *   rename → 只改名称
 *   delete → 二次确认，一级节点会提示连带删掉几篇子文章
 */
const props = defineProps({
  dark: Boolean,
  open: Boolean,
  mode: { type: String, default: "create" }, // create | rename | delete
  node: { type: Object, default: null },
  parentName: { type: String, default: "" },
  childCount: { type: Number, default: 0 },
  defaultCategory: { type: String, default: "" },
  error: { type: String, default: "" },
});
const emit = defineEmits(["close", "submit", "confirm-delete"]);

const CUSTOM = "__custom__";
const draft = reactive({ name: "", choice: NOTE_CATEGORIES[0], custom: "" });

watch(
  () => [props.open, props.mode, props.node],
  () => {
    if (!props.open) return;
    draft.name = props.mode === "rename" ? props.node?.name || "" : "";
    const cat = props.mode === "create" ? props.defaultCategory || "" : "";
    if (NOTE_CATEGORIES.includes(cat)) {
      draft.choice = cat;
      draft.custom = "";
    } else if (cat) {
      draft.choice = CUSTOM;
      draft.custom = cat;
    } else {
      draft.choice = NOTE_CATEGORIES[0];
      draft.custom = "";
    }
  },
  { immediate: true },
);

const category = computed(() => (draft.choice === CUSTOM ? draft.custom.trim() : draft.choice));
const canSubmit = computed(() => (props.mode === "delete" ? true : !!draft.name.trim()));

const title = computed(() => {
  if (props.mode === "rename") return "修改名称";
  if (props.mode === "delete") return "删除确认";
  return props.parentName ? "新建子文章" : "新增文章";
});

const hint = computed(() => {
  if (props.mode === "rename") return props.node?.name ? `原名称：${props.node.name}` : "";
  if (props.mode === "delete") return "";
  return props.parentName ? `将挂在「${props.parentName}」下面` : "将作为「秋招」下的一级文章";
});

const deleteText = computed(() => {
  const name = props.node?.name || "";
  if (props.childCount > 0) {
    return `删除「${name}」会连同它下面的 ${props.childCount} 篇子文章一起删除，删除后无法恢复。`;
  }
  return props.mode === "delete" && props.node?.parentId
    ? `确定删除子文章「${name}」吗？删除后无法恢复。`
    : `确定删除文章「${name}」吗？删除后无法恢复。`;
});

function submit() {
  if (!canSubmit.value) return;
  if (props.mode === "delete") emit("confirm-delete");
  else emit("submit", { name: draft.name.trim(), category: category.value });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(61, 74, 92, 0.25)"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-sm rounded-2xl border shadow-sm p-6"
        :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'"
      >
        <h3 class="text-sm mb-4" style="font-family: 'Noto Serif SC', serif">{{ title }}</h3>

        <template v-if="mode === 'delete'">
          <p class="text-xs leading-relaxed opacity-75 mb-5">{{ deleteText }}</p>
        </template>

        <template v-else>
          <p class="text-[10px] opacity-55 mb-2 pl-1">文章名称</p>
          <input
            v-model="draft.name"
            :placeholder="mode === 'rename' ? '新的名称' : '例如：字节一面复盘'"
            maxlength="60"
            class="w-full rounded-2xl border text-sm px-4 py-2.5 focus:outline-none"
            :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
            @keyup.enter="submit"
          />
          <p v-if="hint" class="text-[10px] opacity-50 mt-1.5 pl-1">{{ hint }}</p>

          <template v-if="mode === 'create'">
            <p class="text-[10px] opacity-55 mb-2 mt-4 pl-1">分类 category</p>
            <select
              v-model="draft.choice"
              class="w-full rounded-2xl border text-xs px-3 py-2.5 focus:outline-none"
              :class="dark ? 'bg-[#2e3440] border-white/10' : 'border-[#3d4a5c]/15 bg-transparent'"
            >
              <option v-for="c in NOTE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
              <option :value="CUSTOM">自定义…</option>
            </select>
            <input
              v-if="draft.choice === CUSTOM"
              v-model="draft.custom"
              placeholder="输入自定义分类，例如：面经"
              maxlength="20"
              class="w-full rounded-2xl border text-xs px-4 py-2 mt-1.5 focus:outline-none"
              :class="dark ? 'bg-white/5 border-white/10' : 'border-[#3d4a5c]/15'"
            />
          </template>
        </template>

        <p v-if="error" class="text-[11px] mt-3 pl-1 text-[#c46a6a]">{{ error }}</p>

        <div class="flex gap-2 mt-5">
          <button
            @click="emit('close')"
            class="flex-1 rounded-2xl border text-xs py-2.5 opacity-70 transition-all duration-300 active:scale-[0.98]"
            :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
          >
            取消
          </button>
          <button
            @click="submit"
            :disabled="!canSubmit"
            class="flex-1 rounded-2xl text-xs py-2.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-40"
            :class="mode === 'delete'
              ? 'bg-[#c46a6a] text-white'
              : dark ? 'bg-[#ece8e1] text-[#2e3440]' : 'bg-[#3d4a5c] text-[#faf9f7]'"
          >
            {{ mode === "delete" ? "确定删除" : mode === "rename" ? "保存" : "创建" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
