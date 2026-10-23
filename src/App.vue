<script setup>
import { computed, ref, onMounted } from "vue";
import TopBar from "./components/TopBar.vue";
import SideNav from "./components/SideNav.vue";
import TimelinePanel from "./components/TimelinePanel.vue";
import TaskCreateModal from "./components/TaskCreateModal.vue";
import TimelineModal from "./components/TimelineModal.vue";
import DayMarkModal from "./components/DayMarkModal.vue";
import TodoOverviewView from "./views/TodoOverviewView.vue";
import TodoView from "./views/TodoView.vue";
import GrowthView from "./views/GrowthView.vue";
import GrowthLogModal from "./components/GrowthLogModal.vue";
import PlaceholderView from "./views/PlaceholderView.vue";
import { useWorkbench } from "./stores/workbench.js";
import { useJournal } from "./stores/journal.js";
import { useDateLine, keyLabel } from "./composables/useDay.js";
import { prefs } from "./composables/usePrefs.js";

const search = ref("");
// 深浅色、时间轴折叠跟着 prefs 走，重开 App 保持上次的样子
const dark = computed({ get: () => prefs.dark, set: (v) => (prefs.dark = v) });
const collapsed = computed({ get: () => prefs.collapsed, set: (v) => (prefs.collapsed = v) });
const activeItem = ref("日常待办");
const openGroups = ref(["待办"]);

const showCreate = ref(false);
const showTlForm = ref(false);
const editingTl = ref(null);

const wb = useWorkbench();
const jb = useJournal();
const dateLine = useDateLine();

/* 起床/休息由 store 统一管（按日期存库），顶部栏与右侧时间轴共用同一份 */
const todayMark = computed(() => wb.markOf(wb.today.value));
const wakeTime = computed(() => todayMark.value.wake);
const restTime = computed(() => todayMark.value.rest);

/* 待办模块两个页面：总览月历 / 某一天的详情。侧栏点「日常待办」永远回到总览 */
const todoMode = ref("overview");

/* 右侧时间轴跟着「正在看的日期」走；非待办页面固定看今天 */
const panelDate = computed(() => (activeItem.value === "日常待办" ? wb.selectedDate.value : wb.today.value));
const panelEntries = computed(() => wb.entriesOn(panelDate.value));
const panelLabel = computed(() => keyLabel(panelDate.value));
const panelIsToday = computed(() => panelDate.value === wb.today.value);
const panelHeading = computed(() => (panelIsToday.value ? "今日时间轴" : "当日时间轴"));
const panelMark = computed(() => wb.markOf(panelDate.value));

/* 时间轴里的「补录/修改」起床、休息：只填一个时间点 */
const markForm = ref({ open: false, kind: "wake" });
function openMark(kind) {
  markForm.value = { open: true, kind };
}
function saveMark(time) {
  wb.setMark(panelDate.value, markForm.value.kind, time);
}
function clearMark() {
  wb.setMark(panelDate.value, markForm.value.kind, "");
}

function onNav(name) {
  if (name === "日常待办") todoMode.value = "overview";
}

function openDay(key) {
  wb.setDate(key);
  todoMode.value = "day";
}

const showGrowth = ref(false);
const editingGrowth = ref(null);

onMounted(() => { wb.load(); jb.load(); });
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden" :class="dark ? 'bg-[#2e3440] text-[#ece8e1]' : 'bg-[#faf9f7] text-[#3d4a5c]'">
    <TopBar v-model:search="search" :dark="dark" :wake-time="wakeTime" :rest-time="restTime" @toggle-dark="dark = !dark" @wake="wb.markNow('wake')" @rest="wb.markNow('rest')" />

    <div class="flex flex-1 min-h-0">
      <SideNav :dark="dark" v-model:active-item="activeItem" v-model:open-groups="openGroups" @nav="onNav" />

      <main class="flex-1 overflow-y-auto">
        <TodoOverviewView
          v-if="activeItem === '日常待办' && todoMode === 'overview'"
          :dark="dark" :title="activeItem"
          @select="openDay"
          @open-create="showCreate = true"
        />
        <TodoView
          v-else-if="activeItem === '日常待办'"
          :dark="dark" :title="activeItem" :date-key="wb.selectedDate.value"
          @back="todoMode = 'overview'"
          @open-create="showCreate = true"
        />
        <GrowthView
          v-else-if="activeItem === '成长日志'"
          :dark="dark" :title="activeItem" :date-line="dateLine"
          @open-create="editingGrowth = null; showGrowth = true"
          @open-edit="(l) => { editingGrowth = l; showGrowth = true; }"
        />
        <PlaceholderView
          v-else-if="activeItem === '长期计划'"
          :dark="dark" title="长期计划" :date-line="dateLine"
          note="长期计划为二期功能：支持 100 天 / 90 天 / 30 天周期计划、每日打卡与进度统计，敬请期待。"
        />
        <PlaceholderView v-else :dark="dark" :title="activeItem" :date-line="dateLine" />
      </main>

      <TimelinePanel
        v-if="!collapsed"
        :dark="dark" :heading="panelHeading" :date-line="panelLabel"
        :wake-time="panelMark.wake" :rest-time="panelMark.rest" :entries="panelEntries"
        @collapse="collapsed = true"
        @create="editingTl = null; showTlForm = true"
        @edit="(e) => { editingTl = e; showTlForm = true; }"
        @delete="wb.delTimelineEntry"
        @edit-wake="openMark('wake')"
        @edit-rest="openMark('rest')"
      />
    </div>

    <button
      v-if="collapsed" @click="collapsed = false"
      class="fixed right-0 top-1/2 -translate-y-1/2 rounded-l-2xl shadow-sm border px-2 py-3 z-20 transition-all duration-300 active:scale-[0.98] opacity-75 hover:opacity-100"
      :class="dark ? 'border-white/10' : 'border-[#3d4a5c]/15'"
    >
      ‹
    </button>

    <TaskCreateModal
      :dark="dark" :open="showCreate" :date-label="wb.selectedLabel.value"
      @close="showCreate = false" @confirm="wb.createTask"
    />
    <GrowthLogModal
      :dark="dark" :open="showGrowth" :editing="editingGrowth"
      :categories="jb.categories.value" :moods="jb.moods.value"
      @close="showGrowth = false"
      @save="(d) => jb.save(d, editingGrowth)"
      @delete="editingGrowth && jb.remove(editingGrowth)"
      @add-category="jb.addCategory" @add-mood="jb.addMood"
    />
    <TimelineModal
      :dark="dark" :open="showTlForm" :editing="editingTl"
      @close="showTlForm = false"
      @save="(d) => wb.saveTimelineEntry(d, editingTl, panelDate)"
    />
    <DayMarkModal
      :dark="dark" :open="markForm.open" :kind="markForm.kind"
      :value="markForm.kind === 'wake' ? panelMark.wake : panelMark.rest"
      :date-label="panelLabel"
      @close="markForm.open = false"
      @save="saveMark"
      @clear="clearMark"
    />
  </div>
</template>
