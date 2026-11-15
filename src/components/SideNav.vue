<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { NAV_GROUPS, ICONS } from "../constants/nav.js";
import { useNotes } from "../stores/notes.js";
import NavNoteModal from "./NavNoteModal.vue";

defineProps({ dark: Boolean });
const emit = defineEmits(["nav"]);
const activeItem = defineModel("activeItem");
const openGroups = defineModel("openGroups");

const notes = useNotes();
const { tree } = notes;

/* 一级节点展开后就能看到它的二级子文章，展开状态只在本次会话里记着 */
const expanded = ref([]);
const menu = ref({ open: false, x: 0, y: 0, kind: "", node: null });
const modal = ref({ open: false, mode: "create", node: null, parent: null, error: "" });
const menuEl = ref(null);

const NOTE_GROUP = "秋招";
const noteKey = (n) => `note:${n.id}`;

function selectChild(name) {
  activeItem.value = name;
  emit("nav", name);
}

/* 长期计划的详情页是 plan:reading / plan:diet，侧栏里仍高亮「长期计划」这一项 */
function isChildActive(name) {
  if (activeItem.value === name) return true;
  return name === "长期计划" && /^plan:(reading|diet)$/.test(activeItem.value || "");
}

function iconSvg(name) {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${ICONS[name] || ""}</svg>`;
}

function openGroup(name) {
  if (!openGroups.value.includes(name)) openGroups.value = [...openGroups.value, name];
}

function toggleGroup(g) {
  if (g.future) return;
  // 秋招的子项来自数据库，点一下只做展开/收起，不跳页面
  if (g.notes) {
    openGroups.value = openGroups.value.includes(g.name)
      ? openGroups.value.filter((x) => x !== g.name)
      : [...openGroups.value, g.name];
    return;
  }
  if (!g.children.length) {
    activeItem.value = g.name;
    return;
  }
  openGroups.value = openGroups.value.includes(g.name)
    ? openGroups.value.filter((x) => x !== g.name)
    : [...openGroups.value, g.name];
}

/* ---- 文章目录 ---- */
function expand(id) {
  if (!expanded.value.includes(id)) expanded.value = [...expanded.value, id];
}

function toggleNode(id) {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter((x) => x !== id)
    : [...expanded.value, id];
}

function selectNote(n) {
  activeItem.value = noteKey(n);
  emit("nav", activeItem.value);
  openGroup(NOTE_GROUP);
  if (n.parentId) expand(n.parentId);
}

/* ---- 右键菜单 ---- */
const MENU_W = 240;
function openMenu(e, kind, node = null) {
  e.preventDefault();
  e.stopPropagation();
  const rows = kind === "level1" ? 3 : kind === "root" ? 1 : 2;
  const x = Math.max(8, Math.min(e.clientX, window.innerWidth - MENU_W - 8));
  const y = Math.max(8, Math.min(e.clientY, window.innerHeight - rows * 34 - 20));
  menu.value = { open: true, x, y, kind, node };
}

function closeMenu() {
  if (menu.value.open) menu.value = { ...menu.value, open: false };
}

const menuItems = computed(() => {
  const { open, kind, node } = menu.value;
  if (!open) return [];
  if (kind === "root") {
    return [{ key: "create", label: "新增文章", run: () => openCreate(null) }];
  }
  if (kind === "level1") {
    return [
      { key: "create-child", label: `新建“${node?.name}”文章的子文章`, run: () => openCreate(node) },
      { key: "rename", label: "修改名称", run: () => openRename(node) },
      { key: "delete", label: "删除", danger: true, run: () => openDelete(node) },
    ];
  }
  return [
    { key: "rename", label: "修改名称", run: () => openRename(node) },
    { key: "delete", label: "删除", danger: true, run: () => openDelete(node) },
  ];
});

function runItem(item) {
  const run = item.run;
  closeMenu();
  run();
}

function onPointerDown(e) {
  if (menuEl.value?.contains(e.target)) return;
  closeMenu();
}

function onKey(e) {
  if (e.key !== "Escape") return;
  closeMenu();
  if (modal.value.open) closeModal();
}

/* ---- 弹窗 ---- */
function openCreate(parent) {
  modal.value = { open: true, mode: "create", node: null, parent, error: "" };
  if (parent) expand(parent.id);
  openGroup(NOTE_GROUP);
}

function openRename(node) {
  modal.value = { open: true, mode: "rename", node, parent: null, error: "" };
}

function openDelete(node) {
  modal.value = { open: true, mode: "delete", node, parent: null, error: "" };
}

function closeModal() {
  modal.value = { ...modal.value, open: false, error: "" };
}

async function submit({ name, category }) {
  try {
    if (modal.value.mode === "create") {
      const parent = modal.value.parent;
      const row = await notes.create({ name, category, parentId: parent ? parent.id : 0 });
      closeModal();
      selectNote(row);
    } else if (modal.value.mode === "rename") {
      await notes.update(modal.value.node.id, { name });
      closeModal();
    }
  } catch (err) {
    modal.value = { ...modal.value, error: err?.message || "保存失败" };
  }
}

/* 删一级节点会连带删掉它下面的子文章，删的正好是当前文章时切到上级 */
async function confirmDelete() {
  const node = modal.value.node;
  if (!node) return;
  const victims = await notes.remove(node.id);
  expanded.value = expanded.value.filter((x) => !victims.includes(x));

  const currentId = Number((/^note:(\d+)$/.exec(activeItem.value || "") || [])[1] || 0);
  if (currentId && victims.includes(currentId)) {
    const parent = node.parentId ? notes.byId(node.parentId) : null;
    const next = parent ? noteKey(parent) : NOTE_GROUP;
    activeItem.value = next;
    emit("nav", next);
  }
  closeModal();
}

const modalProps = computed(() => {
  const { mode, node, parent } = modal.value;
  return {
    mode,
    node,
    parentName: parent ? parent.name : "",
    childCount: node ? notes.childCount(node.id) : 0,
    defaultCategory: parent ? parent.category || NOTE_GROUP : NOTE_GROUP,
  };
});

onMounted(() => {
  notes.load();
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", closeMenu);
  window.removeEventListener("scroll", closeMenu, true);
});
</script>

<template>
  <aside
    class="w-60 md:w-64 border-r flex flex-col shrink-0 overflow-y-auto"
    :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
  >
    <nav class="flex-1 py-4 px-3">
      <div v-for="g in NAV_GROUPS" :key="g.name" class="mb-1">
        <button
          @click="toggleGroup(g)"
          @contextmenu="g.notes && openMenu($event, 'root')"
          :disabled="g.future"
          class="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 ease-in-out"
          :class="g.future ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#3d4a5c]/8'"
        >
          <span class="flex items-center gap-3">
            <span class="w-4 h-4 inline-flex items-center justify-center opacity-60" v-html="iconSvg(g.name)"></span>
            {{ g.name }}
          </span>
          <span v-if="g.future" class="text-[10px] opacity-50">二期</span>
          <svg
            v-else-if="g.children.length || g.notes"
            class="chevron w-3.5 h-3.5 opacity-45"
            :class="{ rotated: openGroups.includes(g.name) }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"
          >
            <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!-- 普通分组：静态子项 -->
        <div v-if="!g.notes && g.children.length" class="submenu pl-7" :class="{ open: openGroups.includes(g.name) }">
          <a
            v-for="c in g.children"
            :key="c"
            @click="selectChild(c)"
            class="block rounded-xl px-3 py-1.5 text-xs cursor-pointer transition-all duration-300"
            :class="isChildActive(c) ? (dark ? 'bg-white/10' : 'bg-[#d4a5a5]/15') : 'opacity-65 hover:opacity-100 hover:bg-[#3d4a5c]/8'"
          >
            {{ c }}
          </a>
        </div>

        <!-- 秋招：数据库里的两级文章目录 -->
        <div
          v-else-if="g.notes"
          class="submenu tall pl-4"
          :class="{ open: openGroups.includes(g.name) }"
          @contextmenu="openMenu($event, 'root')"
        >
          <p v-if="!tree.length" class="px-3 py-1.5 text-[10px] opacity-45 leading-relaxed">
            右键「秋招」新增文章
          </p>

          <div v-for="n in tree" :key="n.id" class="mb-0.5">
            <a
              @click="selectNote(n)"
              @contextmenu="openMenu($event, 'level1', n)"
              class="flex items-center gap-1 rounded-xl pl-2 pr-3 py-1.5 text-xs cursor-pointer transition-all duration-300"
              :class="activeItem === noteKey(n) ? (dark ? 'bg-white/10' : 'bg-[#d4a5a5]/15') : 'opacity-65 hover:opacity-100 hover:bg-[#3d4a5c]/8'"
            >
              <button
                v-if="n.children.length"
                @click.stop="toggleNode(n.id)"
                class="w-4 h-4 flex items-center justify-center shrink-0 opacity-50 hover:opacity-100"
                :title="expanded.includes(n.id) ? '收起子文章' : `展开 ${n.children.length} 篇子文章`"
              >
                <svg
                  class="chevron w-3 h-3" :class="{ rotated: expanded.includes(n.id) }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"
                >
                  <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <span v-else class="w-4 shrink-0"></span>
              <span class="truncate">{{ n.name }}</span>
            </a>

            <div v-if="n.children.length" class="submenu pl-4" :class="{ open: expanded.includes(n.id) }">
              <a
                v-for="c in n.children"
                :key="c.id"
                @click="selectNote(c)"
                @contextmenu="openMenu($event, 'level2', c)"
                class="block rounded-xl px-3 py-1.5 text-xs cursor-pointer transition-all duration-300"
                :class="activeItem === noteKey(c) ? (dark ? 'bg-white/10' : 'bg-[#d4a5a5]/15') : 'opacity-65 hover:opacity-100 hover:bg-[#3d4a5c]/8'"
              >
                {{ c.name }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div class="p-3" :class="dark ? 'border-t border-white/10' : 'border-t border-[#3d4a5c]/15'">
      <button
        class="w-full rounded-2xl border text-xs py-2 opacity-65 hover:opacity-100 transition-all duration-300 active:scale-[0.98]"
        :class="dark ? 'border-white/10 hover:bg-white/5' : 'border-[#3d4a5c]/15 hover:bg-[#3d4a5c]/8'"
      >
        ＋ 新增板块
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="menu.open"
        ref="menuEl"
        class="fixed z-[60]"
        :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
        @contextmenu.prevent
      >
        <div
          class="w-60 rounded-2xl border shadow-sm overflow-hidden py-1"
          :class="dark ? 'bg-[#2e3440] border-white/10' : 'bg-[#faf9f7] border-[#3d4a5c]/12'"
        >
          <button
            v-for="it in menuItems"
            :key="it.key"
            @click="runItem(it)"
            class="w-full text-left text-xs px-3.5 py-2 truncate transition-all duration-300"
            :class="[
              it.danger ? 'text-[#c46a6a]' : '',
              dark ? 'hover:bg-white/8' : 'hover:bg-[#3d4a5c]/8',
            ]"
          >
            {{ it.label }}
          </button>
        </div>
      </div>
    </Teleport>

    <NavNoteModal
      :dark="dark"
      :open="modal.open"
      :error="modal.error"
      v-bind="modalProps"
      @close="closeModal"
      @submit="submit"
      @confirm-delete="confirmDelete"
    />
  </aside>
</template>
