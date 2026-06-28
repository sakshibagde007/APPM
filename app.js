const STORAGE_KEY = "daily-task-manager-tasks";
const THEME_KEY = "daily-task-manager-theme";

/** @typedef {"low" | "medium" | "high"} Priority */
/** @typedef {"today" | "all" | "upcoming" | "completed"} Filter */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} notes
 * @property {Priority} priority
 * @property {string|null} dueDate
 * @property {boolean} completed
 * @property {string} createdAt
 * @property {string|null} completedAt
 */

/** @type {Task[]} */
let tasks = [];
/** @type {Filter} */
let currentFilter = "today";
let searchQuery = "";
let editingTaskId = null;

const CIRCUMFERENCE = 2 * Math.PI * 42;

const els = {
  dateDisplay: document.getElementById("date-display"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.querySelector(".theme-icon"),
  filterBtns: document.querySelectorAll(".filter-btn"),
  countToday: document.getElementById("count-today"),
  countAll: document.getElementById("count-all"),
  countUpcoming: document.getElementById("count-upcoming"),
  countCompleted: document.getElementById("count-completed"),
  progressRing: document.getElementById("progress-ring"),
  progressText: document.getElementById("progress-text"),
  statsDetail: document.getElementById("stats-detail"),
  addForm: document.getElementById("add-form"),
  taskInput: document.getElementById("task-input"),
  prioritySelect: document.getElementById("priority-select"),
  dueDate: document.getElementById("due-date"),
  searchInput: document.getElementById("search-input"),
  taskList: document.getElementById("task-list"),
  emptyState: document.getElementById("empty-state"),
  emptyTitle: document.getElementById("empty-title"),
  emptyMessage: document.getElementById("empty-message"),
  editModal: document.getElementById("edit-modal"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  editForm: document.getElementById("edit-form"),
  editTitle: document.getElementById("edit-title"),
  editNotes: document.getElementById("edit-notes"),
  editPriority: document.getElementById("edit-priority"),
  editDueDate: document.getElementById("edit-due-date"),
  cancelEdit: document.getElementById("cancel-edit"),
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  const date = new Date(iso + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (iso === todayISO()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function generateId() {
  return crypto.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate < todayISO();
}

function isDueToday(task) {
  return task.dueDate === todayISO();
}

function isTodayRelevant(task) {
  if (task.completed) {
    return task.completedAt?.slice(0, 10) === todayISO();
  }
  if (!task.dueDate) return true;
  return task.dueDate <= todayISO();
}

function isUpcoming(task) {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate > todayISO();
}

function filterTasks(list) {
  let filtered = list;

  switch (currentFilter) {
    case "today":
      filtered = list.filter(isTodayRelevant);
      break;
    case "all":
      filtered = list.filter((t) => !t.completed);
      break;
    case "upcoming":
      filtered = list.filter(isUpcoming);
      break;
    case "completed":
      filtered = list.filter((t) => t.completed);
      break;
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
    );
  }

  return filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function updateCounts() {
  els.countToday.textContent = String(tasks.filter(isTodayRelevant).length);
  els.countAll.textContent = String(tasks.filter((t) => !t.completed).length);
  els.countUpcoming.textContent = String(tasks.filter(isUpcoming).length);
  els.countCompleted.textContent = String(tasks.filter((t) => t.completed).length);
}

function updateProgress() {
  const todayTasks = tasks.filter(isTodayRelevant);
  const done = todayTasks.filter((t) => t.completed).length;
  const total = todayTasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  els.progressText.textContent = `${pct}%`;
  els.statsDetail.textContent = `${done} of ${total} tasks done`;
  els.progressRing.style.strokeDashoffset = String(
    CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE
  );
}

function renderTaskItem(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  if (task.completed) li.classList.add("completed");
  if (isOverdue(task)) li.classList.add("overdue");
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`);
  checkbox.addEventListener("change", () => toggleComplete(task.id));

  const body = document.createElement("div");
  body.className = "task-body";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title;

  body.appendChild(title);

  if (task.notes) {
    const notes = document.createElement("div");
    notes.className = "task-notes";
    notes.textContent = task.notes;
    body.appendChild(notes);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = `priority-badge priority-${task.priority}`;
  priority.textContent = task.priority;
  meta.appendChild(priority);

  if (task.dueDate) {
    const due = document.createElement("span");
    due.className = "due-badge";
    if (isOverdue(task)) due.classList.add("overdue");
    due.textContent = isOverdue(task)
      ? `Overdue · ${formatDate(task.dueDate)}`
      : formatDate(task.dueDate);
    meta.appendChild(due);
  }

  body.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "task-action-btn";
  editBtn.title = "Edit";
  editBtn.textContent = "✏️";
  editBtn.addEventListener("click", () => openEditModal(task.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-action-btn delete";
  deleteBtn.title = "Delete";
  deleteBtn.textContent = "🗑️";
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  actions.append(editBtn, deleteBtn);
  li.append(checkbox, body, actions);
  return li;
}

function renderEmptyState() {
  const messages = {
    today: {
      title: "No tasks for today",
      message: "Add a task above to get started. Focus on what matters most today.",
    },
    all: {
      title: "All caught up!",
      message: "You have no active tasks. Add something new when you're ready.",
    },
    upcoming: {
      title: "Nothing scheduled ahead",
      message: "Tasks with future due dates will appear here.",
    },
    completed: {
      title: "No completed tasks yet",
      message: "Finished tasks will show up here so you can track your progress.",
    },
  };

  const msg = messages[currentFilter];
  els.emptyTitle.textContent = msg.title;
  els.emptyMessage.textContent = msg.message;
}

function render() {
  const filtered = filterTasks(tasks);
  els.taskList.innerHTML = "";

  filtered.forEach((task) => {
    els.taskList.appendChild(renderTaskItem(task));
  });

  const isEmpty = filtered.length === 0;
  els.emptyState.classList.toggle("hidden", isEmpty);
  els.taskList.classList.toggle("hidden", isEmpty);

  updateCounts();
  updateProgress();
  renderEmptyState();
}

function addTask(title, priority, dueDate) {
  /** @type {Task} */
  const task = {
    id: generateId(),
    title: title.trim(),
    notes: "",
    priority,
    dueDate: dueDate || null,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.unshift(task);
  saveTasks();
  render();
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId = id;
  els.editTitle.value = task.title;
  els.editNotes.value = task.notes;
  els.editPriority.value = task.priority;
  els.editDueDate.value = task.dueDate || "";
  els.editModal.classList.remove("hidden");
  els.editTitle.focus();
}

function closeEditModal() {
  editingTaskId = null;
  els.editModal.classList.add("hidden");
  els.editForm.reset();
}

function saveEdit(title, notes, priority, dueDate) {
  const task = tasks.find((t) => t.id === editingTaskId);
  if (!task) return;

  task.title = title.trim();
  task.notes = notes.trim();
  task.priority = priority;
  task.dueDate = dueDate || null;
  saveTasks();
  closeEditModal();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  els.filterBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  render();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  els.themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  els.themeIcon.textContent = next === "dark" ? "☀️" : "🌙";
}

function initDateDisplay() {
  const now = new Date();
  els.dateDisplay.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  els.dueDate.value = todayISO();
  els.dueDate.min = todayISO();
}

function bindEvents() {
  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = els.taskInput.value;
    if (!title.trim()) return;

    addTask(title, /** @type {Priority} */ (els.prioritySelect.value), els.dueDate.value);
    els.taskInput.value = "";
    els.taskInput.focus();
  });

  els.searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    render();
  });

  els.filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => setFilter(/** @type {Filter} */ (btn.dataset.filter)));
  });

  els.themeToggle.addEventListener("click", toggleTheme);

  els.editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveEdit(
      els.editTitle.value,
      els.editNotes.value,
      /** @type {Priority} */ (els.editPriority.value),
      els.editDueDate.value
    );
  });

  els.cancelEdit.addEventListener("click", closeEditModal);
  els.modalBackdrop.addEventListener("click", closeEditModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.editModal.classList.contains("hidden")) {
      closeEditModal();
    }
  });
}

function init() {
  initTheme();
  initDateDisplay();
  loadTasks();
  bindEvents();
  render();
  els.taskInput.focus();
}

init();
