import { computed, ref } from "vue";
import { sqlite } from "../api/database.js";

/*
 * 秋招文章目录（note_folder 表）。
 *
 * 只允许两级：
 *   parentId = 0  → 一级节点（「秋招」下的直接子项）
 *   parentId > 0  → 二级节点，挂在某个一级节点下
 * 二级节点下面不允许再挂子节点，这条规则在本文件统一把关，
 * 侧栏只管照着 canAddChild() 决定右键菜单里给不给「新建子文章」。
 *
 * 真身存在 SQLite；Tauri 之外（npm run dev）以及 SQL 写失败时用
 * localStorage 镜像兜底，接口不变，页面层不用关心环境。
 */
const LS_KEY = "workbench.notes.v1";

const rows = ref([]); // 扁平的节点表，树在 tree 里按 parentId 拼
let loaded = false;

const pad = (n) => String(n).padStart(2, "0");
function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const byOrder = (a, b) => a.sortOrder - b.sortOrder || a.id - b.id;

function persistLS() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows.value));
  } catch {
    /* 忽略配额错误 */
  }
}

function restoreLS() {
  try {
    const cached = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (Array.isArray(cached)) rows.value = cached;
  } catch {
    /* 忽略损坏的镜像 */
  }
}

/* 浏览器里没有 SQLite 的自增 id，本地补一个，保证选中态能记住 */
function nextLocalId() {
  return rows.value.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

export function useNotes() {
  const load = async () => {
    if (loaded) return;
    loaded = true;
    restoreLS();
    if (!sqlite.isTauri()) return;
    const dbRows = await sqlite.loadNoteFolders().catch(() => null);
    if (!dbRows) return;
    // 库里说了算：本地镜像只是兜底
    rows.value = dbRows.map(sqlite.rowToNote);
    persistLS();
  };

  /* 两级树：一级节点带 children，侧栏展开时直接遍历 */
  const tree = computed(() =>
    rows.value
      .filter((r) => !r.parentId)
      .sort(byOrder)
      .map((r) => ({ ...r, children: rows.value.filter((c) => c.parentId === r.id).sort(byOrder) })),
  );

  const byId = (id) => rows.value.find((r) => r.id === Number(id)) || null;

  /* 一级节点才允许往下建；二级节点（parentId > 0）锁死 */
  const canAddChild = (node) => !!node && !node.parentId;

  const childCount = (id) => rows.value.filter((r) => r.parentId === Number(id)).length;

  const siblingsOf = (parentId) =>
    rows.value.filter((r) => (r.parentId || 0) === (Number(parentId) || 0));

  const nameTaken = (name, parentId, ignoreId = 0) =>
    siblingsOf(parentId).some((r) => r.id !== ignoreId && r.name === name);

  const nextSortOrder = (parentId) =>
    siblingsOf(parentId).reduce((max, r) => Math.max(max, r.sortOrder || 0), 0) + 1;

  const create = async ({ name, category = "", parentId = 0 }) => {
    const title = String(name || "").trim();
    if (!title) throw new Error("文章名称不能为空");

    const pid = Number(parentId) || 0;
    if (pid) {
      const parent = byId(pid);
      if (!parent) throw new Error("上级文章不存在");
      if (parent.parentId) throw new Error("二级节点下不能再创建子文章");
    }
    // null 与 0 都算「秋招下的一级」，比较时统一成 0
    if (nameTaken(title, pid)) throw new Error("同级下已经有同名文章了");

    const now = stamp();
    const draft = {
      name: title,
      category: String(category || "").trim(),
      parentId: pid,
      sortOrder: nextSortOrder(pid),
      content: "",
      createdAt: now,
      updatedAt: now,
    };

    let id = null;
    if (sqlite.isTauri()) id = await sqlite.insertNoteFolder(draft).catch(() => null);
    if (id == null) id = nextLocalId();

    const row = { ...draft, id };
    rows.value = [...rows.value, row];
    persistLS();
    return row;
  };

  const update = async (id, patch) => {
    const node = byId(id);
    if (!node) return null;

    const next = { ...node, ...patch };
    next.name = String(next.name || "").trim();
    if (!next.name) throw new Error("文章名称不能为空");
    if (nameTaken(next.name, node.parentId, node.id)) throw new Error("同级下已经有同名文章了");
    next.category = String(next.category || "").trim();

    rows.value = rows.value.map((r) => (r.id === node.id ? next : r));
    persistLS();
    if (sqlite.isTauri()) await sqlite.updateNoteFolder(next).catch(() => {});
    return next;
  };

  /* 删除一级节点时连带干掉它下面的二级节点，返回真正被删掉的 id 列表 */
  const remove = async (id) => {
    const node = byId(id);
    if (!node) return [];
    const victims = [node.id, ...rows.value.filter((r) => r.parentId === node.id).map((r) => r.id)];
    rows.value = rows.value.filter((r) => !victims.includes(r.id));
    persistLS();
    if (sqlite.isTauri()) await sqlite.deleteNoteFolder(node.id).catch(() => {});
    return victims;
  };

  const contentOf = (id) => byId(id)?.content || "";

  const saveContent = async (id, content) => {
    const node = byId(id);
    if (!node) return "";
    const updatedAt = stamp();
    rows.value = rows.value.map((r) => (r.id === node.id ? { ...r, content, updatedAt } : r));
    persistLS();
    if (sqlite.isTauri()) await sqlite.saveNoteFolderContent(node.id, content || "", updatedAt).catch(() => {});
    return updatedAt;
  };

  const pathOf = (id) => {
    const node = byId(id);
    if (!node) return [];
    const parent = node.parentId ? byId(node.parentId) : null;
    return parent ? [parent.name, node.name] : [node.name];
  };

  return {
    rows,
    tree,
    load,
    byId,
    canAddChild,
    childCount,
    create,
    update,
    remove,
    contentOf,
    saveContent,
    pathOf,
  };
}
