<script setup>
import { NAV_GROUPS, ICONS } from "../constants/nav.js";

defineProps({ dark: Boolean });
const emit = defineEmits(["nav"]);
const activeItem = defineModel("activeItem");
const openGroups = defineModel("openGroups");

/* 子菜单点击要能被父级感知：同一个菜单再点一次（比如日常待办）也要有反应 */
function selectChild(name) {
  activeItem.value = name;
  emit("nav", name);
}

function iconSvg(name) {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">${ICONS[name] || ""}</svg>`;
}

function toggleGroup(g) {
  if (g.future || !g.children.length) {
    if (!g.children.length && !g.future) activeItem.value = g.name;
    return;
  }
  openGroups.value.includes(g.name)
    ? (openGroups.value = openGroups.value.filter((x) => x !== g.name))
    : openGroups.value.push(g.name);
}
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
            v-else-if="g.children.length"
            class="chevron w-3.5 h-3.5 opacity-45"
            :class="{ rotated: openGroups.includes(g.name) }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"
          >
            <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div v-if="g.children.length" class="submenu pl-7" :class="{ open: openGroups.includes(g.name) }">
          <a
            v-for="c in g.children"
            :key="c"
            @click="selectChild(c)"
            class="block rounded-xl px-3 py-1.5 text-xs cursor-pointer transition-all duration-300"
            :class="activeItem === c ? (dark ? 'bg-white/10' : 'bg-[#d4a5a5]/15') : 'opacity-65 hover:opacity-100 hover:bg-[#3d4a5c]/8'"
          >
            {{ c }}<span v-if="c === '长期计划'" class="ml-1 text-[10px] opacity-50">二期</span>
          </a>
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
  </aside>
</template>
