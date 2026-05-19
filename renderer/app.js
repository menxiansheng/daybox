// ===== Data =====
const CATEGORY_LABELS = { work: '工作', personal: '個人', study: '學習', other: '其他' };

let tasks = [];
let notes = [];
let currentView = 'tasks'; // 'tasks' or 'notes'
let currentCategory = 'all';
let currentFilter = 'all';
let currentSort = 'date-desc';
let searchQuery = '';
let dragSrcId = null;
let noteColor = '#FFF5EE';

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadTasks();
  await loadNotes();
  bindEvents();
  render();
});

// ===== Storage =====
async function loadTasks() {
  try {
    tasks = await window.tasksAPI.read();
  } catch {
    tasks = [];
  }
}
function saveTasks() {
  window.tasksAPI.write(tasks);
}

async function loadNotes() {
  try {
    notes = await window.notesAPI.read();
  } catch {
    notes = [];
  }
}
function saveNotes() {
  window.notesAPI.write(notes);
}

// ===== CRUD =====
function addTask(title, note, category, priority) {
  if (!title.trim()) return;
  tasks.push({
    id: crypto.randomUUID(),
    title: title.trim(),
    note: note.trim(),
    category,
    priority,
    completed: false,
    createdAt: Date.now(),
    order: tasks.length
  });
  saveTasks();
  render();
}

function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    });
  }
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; saveTasks(); render(); }
}

function updateTask(id, data) {
  const t = tasks.find(t => t.id === id);
  if (t) { Object.assign(t, data); saveTasks(); render(); }
}

// ===== Filter / Sort =====
function getFilteredTasks() {
  let list = [...tasks];
  if (currentCategory !== 'all') list = list.filter(t => t.category === currentCategory);
  if (currentFilter === 'active') list = list.filter(t => !t.completed);
  else if (currentFilter === 'completed') list = list.filter(t => t.completed);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q));
  }
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  switch (currentSort) {
    case 'date-desc': list.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'date-asc': list.sort((a, b) => a.createdAt - b.createdAt); break;
    case 'priority': list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]); break;
    case 'name': list.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW')); break;
  }
  return list;
}

// ===== Render =====
function render() {
  renderTasks();
  renderStats();
  renderNotes();
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'flex';
  list.innerHTML = filtered.map(t => createTaskHTML(t)).join('');

  // Bind card events
  list.querySelectorAll('.task-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.task-checkbox').addEventListener('click', () => toggleTask(id));
    card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(id));
    card.querySelector('.btn-delete').addEventListener('click', () => deleteTask(id));

    // Drag
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop', onDrop);
    card.addEventListener('dragend', onDragEnd);
  });
}

function createTaskHTML(t) {
  const date = new Date(t.createdAt);
  const dateStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return `
    <div class="task-card ${t.completed ? 'completed' : ''} priority-${t.priority}" data-id="${t.id}">
      <div class="drag-handle">
        <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>
      </div>
      <div class="task-checkbox ${t.completed ? 'checked' : ''}">
        <svg viewBox="0 0 12 12"><polyline points="2.5,6 5,8.5 9.5,3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="task-info">
        <div class="task-title">${escapeHTML(t.title)}</div>
        ${t.note ? `<div class="task-note">${escapeHTML(t.note)}</div>` : ''}
        <div class="task-meta">
          <span class="task-category-tag cat-${t.category}">${CATEGORY_LABELS[t.category]}</span>
          <span class="priority-dot ${t.priority}"></span>
          <span class="task-date">${dateStr}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn btn-edit" title="編輯">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="task-action-btn delete btn-delete" title="刪除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </div>`;
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `完成率 ${pct}%`;

  // Category counts
  const counts = { all: tasks.length, work: 0, personal: 0, study: 0, other: 0 };
  tasks.forEach(t => counts[t.category]++);
  Object.keys(counts).forEach(k => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.textContent = counts[k];
  });

  // Notes count
  const notesCountEl = document.getElementById('count-notes');
  if (notesCountEl) notesCountEl.textContent = notes.length;
}

// ===== Drag & Drop =====
function onDragStart(e) {
  dragSrcId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const targetId = e.currentTarget.dataset.id;
  if (dragSrcId && dragSrcId !== targetId) {
    const srcIdx = tasks.findIndex(t => t.id === dragSrcId);
    const tgtIdx = tasks.findIndex(t => t.id === targetId);
    if (srcIdx > -1 && tgtIdx > -1) {
      const [moved] = tasks.splice(srcIdx, 1);
      tasks.splice(tgtIdx, 0, moved);
      tasks.forEach((t, i) => t.order = i);
      saveTasks();
      render();
    }
  }
}
function onDragEnd(e) { e.currentTarget.classList.remove('dragging'); dragSrcId = null; }

// ===== Modal =====
function openEditModal(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  document.getElementById('edit-task-id').value = t.id;
  document.getElementById('edit-title').value = t.title;
  document.getElementById('edit-note').value = t.note;
  document.getElementById('edit-category').value = t.category;
  document.getElementById('edit-priority').value = t.priority;
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('edit-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function saveModal() {
  const id = document.getElementById('edit-task-id').value;
  const title = document.getElementById('edit-title').value;
  if (!title.trim()) return;
  updateTask(id, {
    title: title.trim(),
    note: document.getElementById('edit-note').value.trim(),
    category: document.getElementById('edit-category').value,
    priority: document.getElementById('edit-priority').value
  });
  closeModal();
}

// ===== View Switching =====
function switchView(view) {
  currentView = view;
  const mainContent = document.querySelector('.main-content');
  const notesView = document.getElementById('notes-view');
  if (view === 'notes') {
    mainContent.style.display = 'none';
    notesView.style.display = 'flex';
  } else {
    mainContent.style.display = 'flex';
    notesView.style.display = 'none';
  }
}

// ===== Notes CRUD =====
function addNote(title, content, color) {
  if (!title.trim() && !content.trim()) return;
  notes.push({
    id: crypto.randomUUID(),
    title: title.trim() || '未命名便簽',
    content: content.trim(),
    color: color || '#FFF5EE',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  saveNotes();
  render();
}

function deleteNote(id) {
  const card = document.querySelector(`.note-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      notes = notes.filter(n => n.id !== id);
      saveNotes();
      render();
    });
  }
}

function updateNote(id, data) {
  const n = notes.find(n => n.id === id);
  if (n) {
    Object.assign(n, data, { updatedAt: Date.now() });
    saveNotes();
    render();
  }
}

function renderNotes() {
  const grid = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');
  if (!grid) return;

  if (notes.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = notes.map(n => createNoteHTML(n)).join('');

  grid.querySelectorAll('.note-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.task-action-btn')) openNoteModal(id);
    });
    card.querySelector('.btn-note-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(id);
    });
  });
}

function createNoteHTML(n) {
  const date = new Date(n.updatedAt || n.createdAt);
  const dateStr = `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return `
    <div class="note-card" data-id="${n.id}" style="background:${n.color || '#FFF5EE'}">
      <div class="note-card-title">${escapeHTML(n.title)}</div>
      <div class="note-card-content">${escapeHTML(n.content)}</div>
      <div class="note-card-footer">
        <span class="note-card-date">${dateStr}</span>
        <div class="note-card-actions">
          <button class="task-action-btn delete btn-note-delete" title="刪除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>`;
}

// ===== Note Modal =====
function openNoteModal(id) {
  const overlay = document.getElementById('note-modal-overlay');
  if (id) {
    const n = notes.find(n => n.id === id);
    if (!n) return;
    document.getElementById('note-modal-title').textContent = '編輯便簽';
    document.getElementById('note-edit-id').value = n.id;
    document.getElementById('note-edit-title').value = n.title;
    document.getElementById('note-edit-content').value = n.content;
    noteColor = n.color || '#FFF5EE';
  } else {
    document.getElementById('note-modal-title').textContent = '新增便簽';
    document.getElementById('note-edit-id').value = '';
    document.getElementById('note-edit-title').value = '';
    document.getElementById('note-edit-content').value = '';
    noteColor = '#FFF5EE';
  }
  // Update color picker
  document.querySelectorAll('.note-color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === noteColor);
  });
  overlay.classList.add('active');
  document.getElementById('note-edit-title').focus();
}

function closeNoteModal() {
  document.getElementById('note-modal-overlay').classList.remove('active');
}

function saveNoteModal() {
  const id = document.getElementById('note-edit-id').value;
  const title = document.getElementById('note-edit-title').value;
  const content = document.getElementById('note-edit-content').value;
  if (!title.trim() && !content.trim()) return;
  if (id) {
    updateNote(id, { title: title.trim() || '未命名便簽', content: content.trim(), color: noteColor });
  } else {
    addNote(title, content, noteColor);
  }
  closeNoteModal();
}

// ===== Events =====
function bindEvents() {
  // Window controls
  if (window.windowAPI) {
    document.getElementById('btn-minimize').addEventListener('click', () => window.windowAPI.minimize());
    document.getElementById('btn-maximize').addEventListener('click', () => window.windowAPI.maximize());
    document.getElementById('btn-close').addEventListener('click', () => window.windowAPI.close());
  }

  // Sidebar toggle
  const toggleSidebar = () => document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-toggle-notes').addEventListener('click', toggleSidebar);

  // Add task
  document.getElementById('add-task-btn').addEventListener('click', addTaskFromInput);
  document.getElementById('add-task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTaskFromInput();
  });

  // Category filter (task categories)
  document.querySelectorAll('.category-item[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      switchView('tasks');
      render();
    });
  });

  // Notes tab
  document.getElementById('notes-tab').addEventListener('click', () => {
    document.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
    document.getElementById('notes-tab').classList.add('active');
    switchView('notes');
  });

  // Add note button
  document.getElementById('add-note-btn').addEventListener('click', () => openNoteModal(null));

  // Filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Sort
  document.getElementById('sort-select').addEventListener('change', e => {
    currentSort = e.target.value;
    render();
  });

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
  });

  // Task Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveModal);
  // Only close when both mousedown and mouseup happen on the overlay itself
  let taskModalMouseDownOnOverlay = false;
  const taskOverlay = document.getElementById('modal-overlay');
  taskOverlay.addEventListener('mousedown', e => {
    taskModalMouseDownOnOverlay = (e.target === taskOverlay);
  });
  taskOverlay.addEventListener('mouseup', e => {
    if (taskModalMouseDownOnOverlay && e.target === taskOverlay) closeModal();
    taskModalMouseDownOnOverlay = false;
  });

  // Note Modal
  document.getElementById('note-modal-close').addEventListener('click', closeNoteModal);
  document.getElementById('note-modal-cancel').addEventListener('click', closeNoteModal);
  document.getElementById('note-modal-save').addEventListener('click', saveNoteModal);
  let noteModalMouseDownOnOverlay = false;
  const noteOverlay = document.getElementById('note-modal-overlay');
  noteOverlay.addEventListener('mousedown', e => {
    noteModalMouseDownOnOverlay = (e.target === noteOverlay);
  });
  noteOverlay.addEventListener('mouseup', e => {
    if (noteModalMouseDownOnOverlay && e.target === noteOverlay) closeNoteModal();
    noteModalMouseDownOnOverlay = false;
  });

  // Note color picker
  document.querySelectorAll('.note-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      noteColor = btn.dataset.color;
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeNoteModal(); }
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
  });
}

function addTaskFromInput() {
  const title = document.getElementById('add-task-input').value;
  const note = document.getElementById('add-note-input').value;
  const category = document.getElementById('add-category-select').value;
  const priority = document.getElementById('add-priority-select').value;
  addTask(title, note, category, priority);
  document.getElementById('add-task-input').value = '';
  document.getElementById('add-note-input').value = '';
  document.getElementById('add-task-input').focus();
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
