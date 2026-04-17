const { ipcRenderer } = require('electron')

// ── STATE ──
let currentSubject = null
let subjects = ['Mathematics', 'Physics', 'Chemistry', 'History', 'Literature']
let currentFileId = null
let ctxTargetSubject = null
let ctxTargetFileId = null
let modalConfirmCallback = null
let confirmDeleteCallback = null
let formatModalCallback = null
let selectedImageElement = null
let sidebarResizeState = null
let selectedImageWrap = null
let imageResizeDrag = null

let timerInterval = null
let timerSeconds = 25 * 60
let timerTotal = 25 * 60
let timerRunning = false
let sessions = 0

// Flashcard state
let fcMode = 'list'
let fcQueue = []
let fcIdx = 0
let fcFlipped = false

// multi-file selection
let selectedFiles = new Set()

const SUBJECT_COLORS = ['#d4f57a','#67e8f9','#c084fc','#fb923c','#f472b6','#34d399','#facc15','#f87171']

// data shape:
// streak: { count, lastDate, history: { 'YYYY-MM-DD': true } }
// flashcards: { [subject]: [ { id, front, back, due, interval, ease } ] }
// subjectColors: { [subject]: color }
const data = {
  notes: {},
  tasks: {},
  schedule: [],
  flashcards: {},
  streak: { count: 0, lastDate: null, history: {} },
  grades: {},
  subjectColors: {},
  settings: { theme: 'dark', accent: '#d4f57a', sidebarWidth: 210 }
}

// ── THEME ──
const ACCENT_PRESETS = ['#d4f57a','#67e8f9','#c084fc','#fb923c','#f472b6','#34d399']

function applyTheme() {
  const { theme, accent } = data.settings
  const root = document.documentElement
  if (theme === 'light') {
    root.style.setProperty('--bg', '#f5f5f5')
    root.style.setProperty('--surface', '#ffffff')
    root.style.setProperty('--surface2', '#ebebeb')
    root.style.setProperty('--border', '#e0e0e0')
    root.style.setProperty('--border2', '#d0d0d0')
    root.style.setProperty('--text', '#111111')
    root.style.setProperty('--text-muted', '#999999')
    root.style.setProperty('--text-dim', '#555555')
  } else {
    root.style.setProperty('--bg', '#080808')
    root.style.setProperty('--surface', '#0f0f0f')
    root.style.setProperty('--surface2', '#161616')
    root.style.setProperty('--border', '#1e1e1e')
    root.style.setProperty('--border2', '#2a2a2a')
    root.style.setProperty('--text', '#f0f0f0')
    root.style.setProperty('--text-muted', '#555555')
    root.style.setProperty('--text-dim', '#888888')
  }
  // derive a slightly dimmed accent
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-dim', accent + 'cc')
}

// ── HELPERS ──
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
function todayStr() { return new Date().toISOString().slice(0, 10) }

function getFiles(subject) {
  if (!data.notes[subject]) data.notes[subject] = []
  return data.notes[subject]
}
function getCards(subject) {
  if (!data.flashcards[subject]) data.flashcards[subject] = []
  return data.flashcards[subject]
}
function getGrades(subject) {
  if (!data.grades[subject]) data.grades[subject] = { entries: [], target: null }
  return data.grades[subject]
}

// ── STREAK ──
function markGoalAchieved() {
  const today = todayStr()
  if (data.streak.history[today]) return // already achieved today

  data.streak.history[today] = true

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)

  if (data.streak.lastDate === yStr) {
    data.streak.count += 1
  } else if (data.streak.lastDate === today) {
    // already set today somehow, no change
  } else {
    data.streak.count = 1
  }
  data.streak.lastDate = today
  renderSidebarStreak()
  checkStreakMilestone(data.streak.count)
  scheduleSave()
}

function computeStreak() {
  // On load: if last date isn't today or yesterday, streak has broken
  if (!data.streak.lastDate) return
  const today = todayStr()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)
  if (data.streak.lastDate !== today && data.streak.lastDate !== yStr) {
    data.streak.count = 0
  }
}

function renderSidebarStreak() {
  const today = todayStr()
  const done = !!data.streak.history[today]
  const count = data.streak.count
  document.getElementById('streakCount').textContent = count
  document.getElementById('streakDot').className = 'streak-dot ' + (done ? 'done' : 'pending')
  document.getElementById('streakGoalText').textContent = done ? 'Goal complete!' : '1 Pomodoro or flashcard session'
}

// ── PERSISTENCE ──
async function loadFromDisk() {
  const saved = await ipcRenderer.invoke('load-data')
  if (saved) {
    if (saved.subjects) subjects = saved.subjects
    if (saved.notes) Object.assign(data.notes, saved.notes)
    if (saved.tasks) Object.assign(data.tasks, saved.tasks)
    if (saved.schedule) data.schedule = saved.schedule
    if (saved.flashcards) Object.assign(data.flashcards, saved.flashcards)
    if (saved.streak) Object.assign(data.streak, saved.streak)
    if (saved.grades) Object.assign(data.grades, saved.grades)
    if (saved.subjectColors) Object.assign(data.subjectColors, saved.subjectColors)
    if (saved.settings) Object.assign(data.settings, saved.settings)
    if (typeof data.settings.sidebarWidth !== 'number') data.settings.sidebarWidth = 210
  }
  currentSubject = subjects[0] || 'General'
  // seed colours for any subjects that don't have one yet
  subjects.forEach((s, i) => {
    if (!data.subjectColors[s]) data.subjectColors[s] = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
  })
  computeStreak()
  applyTheme()
  applySidebarWidthFromSettings()
}

let diskSaveTimer = null
function scheduleSave() {
  clearTimeout(diskSaveTimer)
  diskSaveTimer = setTimeout(() =>
    ipcRenderer.invoke('save-data', {
      subjects,
      notes: data.notes,
      tasks: data.tasks,
      schedule: data.schedule,
      flashcards: data.flashcards,
      streak: data.streak,
      grades: data.grades,
      subjectColors: data.subjectColors,
      settings: data.settings
    }), 600)
}

// ── BOOT ──
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromDisk()
  updateDate()
  renderSubjects()
  renderTasks()
  renderSchedule()
  updateDashboard()
  updateTimerDisplay()
  updateTimerProgress()
  renderSidebarStreak()
  updateScheduleBadge()

  // Confirm delete modal
  document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirm)
  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    if (confirmDeleteCallback) confirmDeleteCallback()
    closeConfirm()
  })

  // Note search
  document.getElementById('notesSearch').addEventListener('input', e => renderFileList(e.target.value))

  // Multi-file selection
  document.getElementById('selectAllBtn').addEventListener('click', toggleSelectAll)
  document.getElementById('exportSelectedBtn').addEventListener('click', exportSelectedFiles)
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedFiles)

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      if (btn.id === 'settingsGearBtn') {
        document.getElementById('settingsPanel').classList.toggle('hidden')
        renderSettingsPanel()
        return
      }
      switchPage(btn.dataset.page)
    })
  )

  // Add subject
  document.getElementById('addSubjectBtn').addEventListener('click', () => {
    document.getElementById('addSubjectForm').classList.toggle('hidden')
    document.getElementById('newSubjectInput').focus()
  })
  document.getElementById('confirmSubject').addEventListener('click', addSubject)
  document.getElementById('newSubjectInput').addEventListener('keydown', e => { if (e.key === 'Enter') addSubject() })

  // Subject context menu
  document.getElementById('ctxRename').addEventListener('click', () => {
    hideAllMenus()
    openModal('Rename Subject', ctxTargetSubject, newName => renameSubject(ctxTargetSubject, newName))
  })
  document.getElementById('ctxDelete').addEventListener('click', () => {
    hideAllMenus()
    deleteSubject(ctxTargetSubject)
  })

  // File context menu
  document.getElementById('fileCtxRename').addEventListener('click', () => {
    hideAllMenus()
    const file = getFiles(currentSubject).find(f => f.id === ctxTargetFileId)
    if (file) openModal('Rename File', file.name, newName => renameFile(ctxTargetFileId, newName))
  })
  document.getElementById('fileCtxDelete').addEventListener('click', () => {
    hideAllMenus()
    deleteFile(ctxTargetFileId)
  })

  document.addEventListener('click', hideAllMenus)

  // Modal
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal)
  document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    const val = document.getElementById('modalInput').value.trim()
    if (val && modalConfirmCallback) modalConfirmCallback(val)
    closeModal()
  })
  document.getElementById('modalInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = document.getElementById('modalInput').value.trim()
      if (val && modalConfirmCallback) modalConfirmCallback(val)
      closeModal()
    }
    if (e.key === 'Escape') closeModal()
  })

  // Notes
  document.getElementById('newFileBtn').addEventListener('click', createNewFile)
  document.getElementById('backToFilesBtn').addEventListener('click', backToFiles)
  document.getElementById('editorFilename').addEventListener('click', () => {
    if (!currentFileId) return
    const file = getFiles(currentSubject).find(f => f.id === currentFileId)
    if (file) openModal('Rename File', file.name, newName => renameFile(currentFileId, newName))
  })

  const editor = document.getElementById('notesArea')
  editor.addEventListener('input', onNotesInput)
  editor.addEventListener('keyup', updateToolbarState)
  editor.addEventListener('mouseup', updateToolbarState)
  editor.addEventListener('contextmenu', onEditorContextMenu)
  editor.addEventListener('click', onEditorClick)

  document.querySelectorAll('.tb-btn').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      if (!btn.dataset.cmd) return
      e.preventDefault()
      document.execCommand(btn.dataset.cmd, false, null)
      updateToolbarState()
    })
  })
  document.querySelectorAll('.tb-btn[data-align]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault()
      applyAlignment(btn.dataset.align)
      updateToolbarState()
    })
  })
  document.getElementById('fontFamily').addEventListener('change', e => {
    applyFormatAtCursor('fontFamily', e.target.value)
  })
  document.getElementById('fontSize').addEventListener('change', e => {
    applyFormatAtCursor('fontSize', e.target.value)
  })
  document.getElementById('insertImageBtn').addEventListener('click', openImagePicker)
  document.getElementById('imageInput').addEventListener('change', onImagePicked)
  document.querySelectorAll('#imageCtxMenu [data-action]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation()
      const action = el.dataset.action
      if (action) applyImageAction(action)
    })
  })
  document.getElementById('undoBtn').addEventListener('mousedown', e => {
    e.preventDefault()
    document.execCommand('undo', false, null)
    updateToolbarState()
  })
  document.getElementById('redoBtn').addEventListener('mousedown', e => {
    e.preventDefault()
    document.execCommand('redo', false, null)
    updateToolbarState()
  })
  document.getElementById('exportBtn').addEventListener('click', exportNote)

  // Tasks
  document.getElementById('addTaskBtn').addEventListener('click', addTask)
  document.getElementById('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask() })

  // Timer
  document.getElementById('startBtn').addEventListener('click', startTimer)
  document.getElementById('pauseBtn').addEventListener('click', pauseTimer)
  document.getElementById('resetBtn').addEventListener('click', resetTimer)
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      timerSeconds = parseInt(btn.dataset.mins) * 60
      timerTotal = timerSeconds
      timerRunning = false
      clearInterval(timerInterval)
      updateTimerDisplay(); updateTimerProgress()
    })
  })

  // Schedule
  document.getElementById('addTestBtn').addEventListener('click', () =>
    document.getElementById('addTestForm').classList.toggle('hidden')
  )
  document.getElementById('confirmTest').addEventListener('click', addTest)
  ;['testSubject', 'testName', 'testDate'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') addTest() })
  )

  // Flashcards
  document.getElementById('fcNewCardBtn').addEventListener('click', showCardForm)
  document.getElementById('fcCancelBtn').addEventListener('click', hideCardForm)
  document.getElementById('fcSaveBtn').addEventListener('click', saveNewCard)
  document.getElementById('fcStartReviewBtn').addEventListener('click', startReview)
  document.getElementById('fcFlipBtn').addEventListener('click', flipCard)
  document.getElementById('fcGotItBtn').addEventListener('click', () => rateCard(true))
  document.getElementById('fcAgainBtn').addEventListener('click', () => rateCard(false))
  document.getElementById('fcBackBtn').addEventListener('click', endReview)
  document.getElementById('fcFrontInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('fcBackInput').focus()
  })
  document.getElementById('fcBackInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveNewCard()
  })

  // Grades
  document.getElementById('gradeAddBtn').addEventListener('click', addGrade)
  document.getElementById('gradeNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('gradeAchievedInput').focus() })
  document.getElementById('gradeAchievedInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('gradeMaxInput').focus() })
  document.getElementById('gradeMaxInput').addEventListener('keydown', e => { if (e.key === 'Enter') addGrade() })
  document.getElementById('gradeSetTargetBtn').addEventListener('click', setGradeTarget)
  document.getElementById('gradeTargetInput').addEventListener('keydown', e => { if (e.key === 'Enter') setGradeTarget() })

  // Close settings panel when clicking outside
  document.addEventListener('click', e => {
    const panel = document.getElementById('settingsPanel')
    if (!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target.id !== 'settingsGearBtn') {
      panel.classList.add('hidden')
    }
  })

  // Format modal
  document.getElementById('fmtCancelBtn').addEventListener('click', closeFormatModal)
  document.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.fmt
      closeFormatModal()
      if (formatModalCallback) formatModalCallback(fmt)
    })
  })

  // Accent color picker
  document.getElementById('accentPicker').addEventListener('input', e => setAccent(e.target.value))
  initSidebarResize()
  const imgMenu = document.getElementById('imageCtxMenu')
  if (imgMenu) {
    imgMenu.addEventListener('mousedown', e => e.stopPropagation())
    imgMenu.addEventListener('click', e => e.stopPropagation())
  }
  window.addEventListener('mousemove', onImageResizeMove)
  window.addEventListener('mouseup', onImageResizeUp)
})

// ── SCHEDULE BADGE ──
function updateScheduleBadge() {
  const today = new Date(); today.setHours(0,0,0,0)
  const dueSoon = data.schedule.filter(t => {
    const d = new Date(t.date + 'T00:00:00')
    const diff = Math.round((d - today) / 86400000)
    return diff >= 0 && diff <= 3
  }).length
  const btn = document.querySelector('.nav-btn[data-page="schedule"]')
  if (!btn) return
  let badge = btn.querySelector('.nav-badge')
  if (dueSoon > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; btn.appendChild(badge) }
    badge.textContent = dueSoon
  } else {
    if (badge) badge.remove()
  }
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey
  if (!ctrl) return

  // Ctrl+S — flash saved indicator if in editor
  if (e.key === 's') {
    e.preventDefault()
    if (currentFileId) {
      saveCurrentFile()
      const ind = document.getElementById('savedIndicator')
      ind.classList.add('show')
      setTimeout(() => ind.classList.remove('show'), 1500)
    }
    return
  }

  // Ctrl+N — new note or new flashcard depending on active page
  if (e.key === 'n') {
    e.preventDefault()
    const notesPage = document.getElementById('page-notes')
    const fcPage = document.getElementById('page-flashcards')
    if (notesPage.classList.contains('active')) {
      // only if in file list view, not editor
      if (!document.getElementById('notesEditorView').classList.contains('hidden')) return
      createNewFile()
    } else if (fcPage.classList.contains('active')) {
      showCardForm()
    }
    return
  }

  // Ctrl+B / I / U — only when editor is focused
  const editor = document.getElementById('notesArea')
  if (document.activeElement === editor || editor.contains(document.activeElement)) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); document.execCommand('undo'); return }
    if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); document.execCommand('redo'); return }
    if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); updateToolbarState() }
    if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); updateToolbarState() }
    if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); updateToolbarState() }
  }
})
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  const target = document.getElementById('page-' + page)
  if (target) {
    target.classList.add('active')
    // trigger animation by briefly removing and re-adding the class
    target.style.animation = 'none'
    requestAnimationFrame(() => { target.style.animation = '' })
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page))
  if (page === 'notes') showFileList()
  if (page === 'tasks') renderTasks()
  if (page === 'dashboard') updateDashboard()
  if (page === 'flashcards') renderFlashcardList()
  if (page === 'progress') renderProgress()
  if (page === 'grades') renderGrades()
  updateScheduleBadge()
}

// ── SUBJECTS ──
function renderSubjects() {
  const list = document.getElementById('subjectList')
  list.innerHTML = subjects.map(s => `
    <div class="subject-row ${s === currentSubject ? 'active' : ''}">
      <button class="subject-btn" data-subject="${s}">${s}</button>
      <button class="subject-ctx-btn" data-subject="${s}" title="Options">⋯</button>
    </div>
  `).join('')

  list.querySelectorAll('.subject-btn').forEach(btn =>
    btn.addEventListener('click', () => selectSubject(btn.dataset.subject))
  )
  list.querySelectorAll('.subject-ctx-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); showCtxMenu(e, 'ctxMenu', () => { ctxTargetSubject = btn.dataset.subject }) })
  )
  list.querySelectorAll('.subject-row').forEach(row =>
    row.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showCtxMenu(e, 'ctxMenu', () => { ctxTargetSubject = row.querySelector('.subject-btn').dataset.subject }) })
  )
}

function selectSubject(name) {
  currentSubject = name
  currentFileId = null
  renderSubjects()
  updateSubjectLabels()
  showFileList()
  renderTasks()
  updateDashboard()
  const fcPage = document.getElementById('page-flashcards')
  if (fcPage && fcPage.classList.contains('active')) renderFlashcardList()
  const gradesPage = document.getElementById('page-grades')
  if (gradesPage && gradesPage.classList.contains('active')) renderGrades()
}

function addSubject() {
  const input = document.getElementById('newSubjectInput')
  const name = input.value.trim()
  if (!name) return
  if (subjects.includes(name)) { showError(`"${name}" already exists.`); return }
  subjects.push(name)
  // assign next colour in rotation
  const usedColors = Object.values(data.subjectColors)
  const nextColor = SUBJECT_COLORS.find(c => !usedColors.includes(c)) || SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
  data.subjectColors[name] = nextColor
  input.value = ''
  document.getElementById('addSubjectForm').classList.add('hidden')
  renderSubjects()
  selectSubject(name)
  scheduleSave()
}

function renameSubject(oldName, newName) {
  if (!newName || newName === oldName || subjects.includes(newName)) return
  const idx = subjects.indexOf(oldName)
  if (idx === -1) return
  subjects[idx] = newName
  if (data.notes[oldName]) { data.notes[newName] = data.notes[oldName]; delete data.notes[oldName] }
  if (data.tasks[oldName]) { data.tasks[newName] = data.tasks[oldName]; delete data.tasks[oldName] }
  if (data.flashcards[oldName]) { data.flashcards[newName] = data.flashcards[oldName]; delete data.flashcards[oldName] }
  if (data.grades[oldName]) { data.grades[newName] = data.grades[oldName]; delete data.grades[oldName] }
  if (data.subjectColors[oldName]) { data.subjectColors[newName] = data.subjectColors[oldName]; delete data.subjectColors[oldName] }
  if (currentSubject === oldName) currentSubject = newName
  renderSubjects()
  updateSubjectLabels()
  scheduleSave()
}

function deleteSubject(name) {
  if (subjects.length <= 1) return
  openConfirm('Delete Subject', `Delete "${name}" and all its notes, tasks, flashcards and grades? This cannot be undone.`, () => {
    subjects = subjects.filter(s => s !== name)
    delete data.notes[name]
    delete data.tasks[name]
    delete data.flashcards[name]
    delete data.grades[name]
    delete data.subjectColors[name]
    if (currentSubject === name) selectSubject(subjects[0])
    else renderSubjects()
    scheduleSave()
  })
}

function updateSubjectLabels() {
  document.getElementById('dashSubjectLabel').textContent = currentSubject
  document.getElementById('notesSubjectLabel').textContent = currentSubject
  document.getElementById('editorSubjectLabel').textContent = currentSubject
  document.getElementById('tasksSubjectLabel').textContent = currentSubject
  document.getElementById('fcSubjectLabel').textContent = currentSubject
  document.getElementById('gradesSubjectLabel').textContent = currentSubject
}

// ── CONTEXT MENUS ──
function showCtxMenu(e, menuId, setup) {
  e.stopPropagation()
  hideAllMenus()
  if (setup) setup()
  const menu = document.getElementById(menuId)
  menu.classList.remove('hidden')
  const x = Math.min(e.clientX, window.innerWidth - 170)
  const y = Math.min(e.clientY, window.innerHeight - 110)
  menu.style.left = x + 'px'
  menu.style.top = y + 'px'
}

function hideAllMenus() {
  document.getElementById('ctxMenu').classList.add('hidden')
  document.getElementById('fileCtxMenu').classList.add('hidden')
  document.getElementById('imageCtxMenu').classList.add('hidden')
}

// ── MODAL ──
function openModal(title, defaultValue, onConfirm) {
  modalConfirmCallback = onConfirm
  document.getElementById('modalTitle').textContent = title
  const input = document.getElementById('modalInput')
  input.value = defaultValue || ''
  document.getElementById('modalOverlay').classList.remove('hidden')
  setTimeout(() => { input.focus(); input.select() }, 50)
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden')
  modalConfirmCallback = null
}

// ── CONFIRM DELETE ──
function openConfirm(title, msg, onConfirm) {
  confirmDeleteCallback = onConfirm
  document.getElementById('confirmTitle').textContent = title
  document.getElementById('confirmMsg').textContent = msg
  document.getElementById('confirmOverlay').classList.remove('hidden')
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.add('hidden')
  confirmDeleteCallback = null
}

function openFormatModal(onPick) {
  formatModalCallback = onPick
  document.getElementById('formatModal').classList.remove('hidden')
}

function closeFormatModal() {
  document.getElementById('formatModal').classList.add('hidden')
  formatModalCallback = null
}
function showFileList() {
  document.getElementById('notesFileView').classList.remove('hidden')
  document.getElementById('notesEditorView').classList.add('hidden')
  currentFileId = null
  selectedFiles.clear()
  renderFileList()
  updateSubjectLabels()
}

function renderFileList(searchQuery = '') {
  const allFiles = getFiles(currentSubject)
  const q = searchQuery.toLowerCase().trim()
  const files = q
    ? allFiles.filter(f => f.name.toLowerCase().includes(q) || stripHtml(f.content).toLowerCase().includes(q))
    : allFiles
  const list = document.getElementById('fileList')
  const empty = document.getElementById('fileListEmpty')
  empty.style.display = files.length === 0 ? 'block' : 'none'
  empty.textContent = q && allFiles.length > 0 ? 'No files match your search.' : 'No files yet. Create one above.'

  list.innerHTML = files.map(f => {
    const preview = stripHtml(f.content).slice(0, 80).trim() || 'Empty file'
    const date = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : ''
    const checked = selectedFiles.has(f.id)
    return `
      <div class="file-item ${checked ? 'file-selected' : ''}" data-id="${f.id}">
        <input type="checkbox" class="file-checkbox" data-id="${f.id}" ${checked ? 'checked' : ''}>
        <div class="file-icon">📄</div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-meta">${preview}${date ? ' · ' + date : ''}</div>
        </div>
        <button class="file-ctx-btn" data-id="${f.id}" title="Options">⋯</button>
      </div>
    `
  }).join('')

  list.querySelectorAll('.file-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      e.stopPropagation()
      if (cb.checked) selectedFiles.add(cb.dataset.id)
      else selectedFiles.delete(cb.dataset.id)
      cb.closest('.file-item').classList.toggle('file-selected', cb.checked)
      updateSelectionBar(files)
    })
  })

  list.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.classList.contains('file-ctx-btn') || e.target.classList.contains('file-checkbox')) return
      openFile(item.dataset.id)
    })
    item.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation()
      showCtxMenu(e, 'fileCtxMenu', () => { ctxTargetFileId = item.dataset.id })
    })
  })
  list.querySelectorAll('.file-ctx-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      showCtxMenu(e, 'fileCtxMenu', () => { ctxTargetFileId = btn.dataset.id })
    })
  })

  updateSelectionBar(files)
}

function updateSelectionBar(files) {
  const bar = document.getElementById('fileSelectionBar')
  // remove any selected IDs that no longer exist
  const existingIds = new Set(files.map(f => f.id))
  for (const id of [...selectedFiles]) {
    if (!existingIds.has(id)) selectedFiles.delete(id)
  }
  const n = selectedFiles.size
  if (n === 0) { bar.classList.add('hidden'); return }
  bar.classList.remove('hidden')
  document.getElementById('selectionCount').textContent = `${n} file${n !== 1 ? 's' : ''} selected`
  const allSelected = files.length > 0 && files.every(f => selectedFiles.has(f.id))
  document.getElementById('selectAllBtn').textContent = allSelected ? 'Deselect all' : 'Select all'
}

function toggleSelectAll() {
  const files = getFiles(currentSubject)
  const q = document.getElementById('notesSearch').value.toLowerCase().trim()
  const visible = q ? files.filter(f => f.name.toLowerCase().includes(q) || stripHtml(f.content).toLowerCase().includes(q)) : files
  const allSelected = visible.every(f => selectedFiles.has(f.id))
  if (allSelected) visible.forEach(f => selectedFiles.delete(f.id))
  else visible.forEach(f => selectedFiles.add(f.id))
  renderFileList(document.getElementById('notesSearch').value)
}

function deleteSelectedFiles() {
  const files = getFiles(currentSubject).filter(f => selectedFiles.has(f.id))
  if (!files.length) return
  const n = files.length
  openConfirm(
    'Delete Files',
    `Delete ${n} file${n !== 1 ? 's' : ''}? This cannot be undone.`,
    () => {
      files.forEach(f => selectedFiles.delete(f.id))
      data.notes[currentSubject] = getFiles(currentSubject).filter(f => !files.find(d => d.id === f.id))
      renderFileList()
      updateDashboard()
      scheduleSave()
    }
  )
}

function exportSelectedFiles() {
  const files = getFiles(currentSubject).filter(f => selectedFiles.has(f.id))
  if (!files.length) return
  openFormatModal(format => {
    ipcRenderer.send('export-folder', {
      format,
      subject: currentSubject,
      files: files.map(f => ({ name: f.name, plainText: stripHtml(f.content), htmlContent: f.content }))
    })
  })
}

function stripHtml(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.innerText || ''
}

function createNewFile() {
  const files = getFiles(currentSubject)
  const name = 'Note ' + (files.length + 1)
  const file = { id: uid(), name, content: '', updatedAt: Date.now() }
  files.unshift(file)
  scheduleSave()
  openFile(file.id)
}

function openFile(id) {
  const file = getFiles(currentSubject).find(f => f.id === id)
  if (!file) return
  currentFileId = id
  document.getElementById('notesFileView').classList.add('hidden')
  document.getElementById('notesEditorView').classList.remove('hidden')
  document.getElementById('editorFilename').textContent = file.name
  const editor = document.getElementById('notesArea')
  editor.innerHTML = file.content
  hydrateEditorEntities(editor)
  updateCharCount()
  updateSubjectLabels()
  editor.focus()
}

function backToFiles() {
  saveCurrentFile()
  showFileList()
  updateDashboard()
}

function saveCurrentFile() {
  if (!currentFileId) return
  const file = getFiles(currentSubject).find(f => f.id === currentFileId)
  if (!file) return
  file.content = document.getElementById('notesArea').innerHTML
  file.updatedAt = Date.now()
  scheduleSave()
}

function renameFile(id, newName) {
  const file = getFiles(currentSubject).find(f => f.id === id)
  if (!file || !newName) return
  file.name = newName
  if (currentFileId === id) document.getElementById('editorFilename').textContent = newName
  renderFileList()
  scheduleSave()
}

function deleteFile(id) {
  const file = getFiles(currentSubject).find(f => f.id === id)
  const name = file ? file.name : 'this file'
  openConfirm('Delete File', `Delete "${name}"? This cannot be undone.`, () => {
    selectedFiles.delete(id)
    data.notes[currentSubject] = getFiles(currentSubject).filter(f => f.id !== id)
    if (currentFileId === id) showFileList()
    else renderFileList()
    updateDashboard()
    scheduleSave()
  })
}

// ── NOTES EDITOR ──
let noteSaveTimer = null
function onNotesInput() {
  saveCurrentFile()
  updateCharCount()
  clearTimeout(noteSaveTimer)
  const ind = document.getElementById('savedIndicator')
  ind.classList.remove('show')
  noteSaveTimer = setTimeout(() => ind.classList.add('show'), 800)
}

function updateCharCount() {
  const text = (document.getElementById('notesArea').innerText || '').replace(/^\n$/, '').replace(/\u200B/g, '')
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  document.getElementById('charCount').textContent = `${text.length} characters · ${words} words`
}

function updateToolbarState() {
  document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd))
  })
}

function exportNote() {
  const file = currentFileId ? getFiles(currentSubject).find(f => f.id === currentFileId) : null
  const name = file ? file.name : currentSubject
  const editor = document.getElementById('notesArea')
  openFormatModal(format => {
    ipcRenderer.send('export-notes', {
      format,
      subject: name,
      noteName: name,
      subjectName: currentSubject,
      plainText: editor.innerText || '',
      htmlContent: editor.innerHTML
    })
  })
}

// ── TASKS ──
function renderTasks() {
  if (!data.tasks[currentSubject]) data.tasks[currentSubject] = []
  const tasks = data.tasks[currentSubject]
  const list = document.getElementById('taskList')
  const empty = document.getElementById('taskEmpty')
  empty.style.display = tasks.length === 0 ? 'block' : 'none'
  list.innerHTML = tasks.map((t, i) => `
    <li class="task-item ${t.done ? 'done' : ''}">
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${i})">
      <span>${t.text}</span>
      <button class="task-delete" onclick="deleteTask(${i})">×</button>
    </li>
  `).join('')
  updateDashboard()
}

function addTask() {
  const input = document.getElementById('taskInput')
  const text = input.value.trim()
  if (!text) { showError('Please enter a task name.'); return }
  if (!data.tasks[currentSubject]) data.tasks[currentSubject] = []
  data.tasks[currentSubject].push({ text, done: false })
  input.value = ''
  renderTasks()
  scheduleSave()
}

function toggleTask(i) {
  data.tasks[currentSubject][i].done = !data.tasks[currentSubject][i].done
  renderTasks(); scheduleSave()
}

function deleteTask(i) {
  data.tasks[currentSubject].splice(i, 1)
  renderTasks(); scheduleSave()
}

// ── TIMER ──
// ── FORMAT AT CURSOR (Word-style, pure DOM) ──
let pendingFontSize = '14px'
let pendingFontFamily = null

function applyFormatAtCursor(type, value) {
  const editor = document.getElementById('notesArea')
  editor.focus()
  const sel = window.getSelection()
  if (!sel) return

  if (type === 'fontSize') pendingFontSize = value
  if (type === 'fontFamily') pendingFontFamily = value

  if (!sel.isCollapsed) {
    // apply to selected text by wrapping in a span
    const range = sel.getRangeAt(0)
    // unwrap any existing size spans inside the selection first
    const frag = range.extractContents()
    frag.querySelectorAll('span[data-fmt]').forEach(s => {
      const parent = s.parentNode
      while (s.firstChild) parent.insertBefore(s.firstChild, s)
      parent.removeChild(s)
    })
    const span = document.createElement('span')
    span.setAttribute('data-fmt', '1')
    span.style.fontSize = pendingFontSize
    if (pendingFontFamily) span.style.fontFamily = pendingFontFamily
    span.style.lineHeight = 'normal'
    span.appendChild(frag)
    range.insertNode(span)
    // move caret to end of inserted span
    range.setStartAfter(span)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    return
  }

  // no selection — insert anchor span at cursor for next typing
  const range = sel.getRangeAt(0)
  // remove any previous zero-width anchor spans we left
  editor.querySelectorAll('span[data-anchor]').forEach(s => {
    if (s.textContent === '\u200B') s.remove()
  })
  const span = document.createElement('span')
  span.setAttribute('data-fmt', '1')
  span.setAttribute('data-anchor', '1')
  span.style.fontSize = pendingFontSize
  if (pendingFontFamily) span.style.fontFamily = pendingFontFamily
  span.style.lineHeight = 'normal'
  span.appendChild(document.createTextNode('\u200B'))
  range.insertNode(span)
  range.setStart(span.firstChild, 1)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

function playTimerChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5)
      osc.start(start)
      osc.stop(start + 0.5)
    })
  } catch(e) {}
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0')
  const s = (timerSeconds % 60).toString().padStart(2, '0')
  const str = m + ':' + s
  document.getElementById('timerDisplay').textContent = str
  document.getElementById('dashTimer').textContent = str
}
function updateTimerProgress() {
  document.getElementById('timerProgress').style.strokeDashoffset =
    (2 * Math.PI * 88) * (1 - timerSeconds / timerTotal)
}
function startTimer() {
  if (timerRunning) return
  timerRunning = true
  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerRunning = false
      sessions++
      document.getElementById('sessionCount').textContent = sessions
      playTimerChime()
      // only full Pomodoro (25 min) counts toward goal
      const activeMode = document.querySelector('.mode-btn.active')
      if (activeMode && parseInt(activeMode.dataset.mins) === 25) {
        markGoalAchieved()
      }
      return
    }
    timerSeconds--; updateTimerDisplay(); updateTimerProgress()
  }, 1000)
}
function pauseTimer() { timerRunning = false; clearInterval(timerInterval) }
function resetTimer() {
  timerRunning = false; clearInterval(timerInterval)
  timerSeconds = parseInt(document.querySelector('.mode-btn.active').dataset.mins) * 60
  timerTotal = timerSeconds; updateTimerDisplay(); updateTimerProgress()
}

// ── SCHEDULE ──
function renderSchedule() {
  const list = document.getElementById('scheduleList')
  const empty = document.getElementById('scheduleEmpty')
  const sorted = [...data.schedule].sort((a, b) => new Date(a.date) - new Date(b.date))
  empty.style.display = sorted.length === 0 ? 'block' : 'none'
  list.innerHTML = sorted.map(t => {
    const d = new Date(t.date + 'T00:00:00')
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff = Math.round((d - today) / 86400000)
    const day = d.getDate().toString().padStart(2, '0')
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase()
    const countdownClass = diff === 0 ? 'today' : diff > 0 && diff <= 3 ? 'soon' : ''
    const countdownText = diff === 0 ? 'Today!' : diff < 0 ? 'Past' : `In ${diff} day${diff !== 1 ? 's' : ''}`
    const idx = data.schedule.indexOf(t)
    return `
      <div class="test-item">
        <div class="test-date-block"><div class="test-day">${day}</div><div class="test-month">${month}</div></div>
        <div class="test-info"><div class="test-name">${t.name}</div><div class="test-subject">${t.subject}</div></div>
        <div class="test-countdown ${countdownClass}">${countdownText}</div>
        <button class="test-delete" onclick="deleteTest(${idx})">×</button>
      </div>`
  }).join('')
  updateDashboard()
}

function addTest() {
  const subject = document.getElementById('testSubject').value.trim()
  const name = document.getElementById('testName').value.trim()
  const date = document.getElementById('testDate').value
  if (!subject || !name || !date) return
  data.schedule.push({ subject, name, date })
  document.getElementById('testSubject').value = ''
  document.getElementById('testName').value = ''
  document.getElementById('testDate').value = ''
  document.getElementById('addTestForm').classList.add('hidden')
  renderSchedule(); scheduleSave()
  updateScheduleBadge()
}

function deleteTest(i) {
  data.schedule.splice(i, 1)
  renderSchedule(); scheduleSave()
  updateScheduleBadge()
}

// ── DASHBOARD ──
function updateDashboard() {
  updateSubjectLabels()
  const tasks = data.tasks[currentSubject] || []
  document.getElementById('dashTaskCount').textContent = tasks.filter(t => !t.done).length
  const files = getFiles(currentSubject)
  document.getElementById('dashFileCount').textContent = files.length

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming = data.schedule
    .filter(t => new Date(t.date + 'T00:00:00') >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (upcoming.length > 0) {
    document.getElementById('dashNextTest').textContent = upcoming[0].name
    const diff = Math.round((new Date(upcoming[0].date + 'T00:00:00') - today) / 86400000)
    document.getElementById('dashNextTestDate').textContent =
      (diff === 0 ? 'Today!' : `In ${diff} day${diff !== 1 ? 's' : ''}`) + ' — ' + upcoming[0].subject
  } else {
    document.getElementById('dashNextTest').textContent = '—'
    document.getElementById('dashNextTestDate').textContent = 'No upcoming tests'
  }
}

function updateDate() {
  document.getElementById('dateDisplay').textContent =
    new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── FLASHCARDS ──
function renderFlashcardList() {
  fcMode = 'list'
  const reviewView = document.getElementById('fcReviewView')
  // restore review view html if it was replaced by finish screen
  if (!document.getElementById('fcFlipBtn')) {
    reviewView.innerHTML = `
      <div class="fc-review-header">
        <button class="back-btn" id="fcBackBtn">← Back</button>
        <span id="fcProgress" class="fc-progress-label"></span>
      </div>
      <div class="fc-card-wrap">
        <div class="fc-review-card" id="fcReviewCard">
          <div class="fc-review-front" id="fcCardFront"></div>
          <div class="fc-review-back" id="fcCardBack"></div>
        </div>
      </div>
      <div class="fc-review-actions">
        <button class="fc-flip-btn" id="fcFlipBtn">Flip card</button>
        <div class="fc-answer-btns hidden" id="fcReviewAnswer">
          <button class="fc-again-btn" id="fcAgainBtn">✕ Again</button>
          <button class="fc-gotit-btn" id="fcGotItBtn">✓ Got it</button>
        </div>
      </div>
    `
    document.getElementById('fcBackBtn').addEventListener('click', endReview)
    document.getElementById('fcFlipBtn').addEventListener('click', flipCard)
    document.getElementById('fcGotItBtn').addEventListener('click', () => rateCard(true))
    document.getElementById('fcAgainBtn').addEventListener('click', () => rateCard(false))
  }

  document.getElementById('fcListView').classList.remove('hidden')
  reviewView.classList.add('hidden')
  updateSubjectLabels()

  const cards = getCards(currentSubject)
  const list = document.getElementById('fcCardList')
  const empty = document.getElementById('fcEmpty')
  const reviewBtn = document.getElementById('fcStartReviewBtn')
  const dueCount = cards.filter(c => !c.due || c.due <= Date.now()).length

  empty.style.display = cards.length === 0 ? 'block' : 'none'
  reviewBtn.style.display = cards.length === 0 ? 'none' : 'inline-block'

  if (cards.length > 0) {
    reviewBtn.textContent = dueCount > 0 ? `Review (${dueCount} due)` : 'Review (none due)'
    reviewBtn.disabled = dueCount === 0
    reviewBtn.style.opacity = dueCount === 0 ? '0.4' : '1'
  }

  list.innerHTML = cards.map((c, i) => `
    <div class="fc-card-row">
      <div class="fc-card-content">
        <div class="fc-front">${c.front}</div>
        <div class="fc-back">${c.back}</div>
      </div>
      <button class="fc-delete-btn" onclick="deleteCard(${i})">×</button>
    </div>
  `).join('')
}

function showCardForm() {
  document.getElementById('fcAddForm').classList.remove('hidden')
  document.getElementById('fcFrontInput').focus()
}

function hideCardForm() {
  document.getElementById('fcAddForm').classList.add('hidden')
  document.getElementById('fcFrontInput').value = ''
  document.getElementById('fcBackInput').value = ''
}

function saveNewCard() {
  const front = document.getElementById('fcFrontInput').value.trim()
  const back = document.getElementById('fcBackInput').value.trim()
  if (!front || !back) return
  const card = { id: uid(), front, back, due: Date.now(), interval: 1, ease: 2.5 }
  getCards(currentSubject).unshift(card)
  hideCardForm()
  renderFlashcardList()
  scheduleSave()
}

function deleteCard(i) {
  getCards(currentSubject).splice(i, 1)
  renderFlashcardList()
  scheduleSave()
}

// ── FLASHCARD REVIEW (SM-2 spaced repetition) ──
function startReview() {
  const cards = getCards(currentSubject)
  fcQueue = cards.filter(c => !c.due || c.due <= Date.now())
  if (fcQueue.length === 0) return
  fcIdx = 0
  fcFlipped = false
  document.getElementById('fcListView').classList.add('hidden')
  document.getElementById('fcReviewView').classList.remove('hidden')
  showReviewCard()
}

function showReviewCard() {
  if (fcIdx >= fcQueue.length) {
    finishReview()
    return
  }
  fcFlipped = false
  const card = fcQueue[fcIdx]
  const cardEl = document.getElementById('fcReviewCard')
  cardEl.classList.remove('flipped')
  document.getElementById('fcCardFront').textContent = card.front
  document.getElementById('fcCardBack').textContent = card.back
  document.getElementById('fcReviewAnswer').classList.add('hidden')
  document.getElementById('fcFlipBtn').classList.remove('hidden')
  document.getElementById('fcProgress').textContent = `${fcIdx + 1} / ${fcQueue.length}`
}

function flipCard() {
  fcFlipped = true
  document.getElementById('fcReviewCard').classList.add('flipped')
  setTimeout(() => {
    document.getElementById('fcReviewAnswer').classList.remove('hidden')
    document.getElementById('fcFlipBtn').classList.add('hidden')
  }, 300)
}

function rateCard(gotIt) {
  const card = fcQueue[fcIdx]
  const original = getCards(currentSubject).find(c => c.id === card.id)
  if (original) {
    if (gotIt) {
      original.ease = Math.max(1.3, original.ease + 0.1)
      original.interval = Math.round(original.interval * original.ease)
      original.due = Date.now() + original.interval * 24 * 60 * 60 * 1000
    } else {
      original.interval = 1
      original.ease = Math.max(1.3, original.ease - 0.2)
      original.due = Date.now() + 60 * 1000
    }
  }
  fcIdx++
  scheduleSave()
  showReviewCard()
}

function finishReview() {
  markGoalAchieved()
  const reviewCount = fcQueue.length
  document.getElementById('fcReviewView').innerHTML = `
    <div class="fc-finish">
      <div class="fc-finish-icon">✓</div>
      <div class="fc-finish-title">Session complete!</div>
      <div class="fc-finish-sub">${reviewCount} card${reviewCount !== 1 ? 's' : ''} reviewed</div>
      <button class="btn-accent-outline" onclick="renderFlashcardList()" style="margin-top:24px">Back to deck</button>
    </div>
  `
  renderSidebarStreak()
}

function endReview() {
  renderFlashcardList()
}

// ── PROGRESS PAGE ──
function renderProgress() {
  const streak = data.streak
  document.getElementById('progStreakCount').textContent = streak.count
  const totalDays = Object.keys(streak.history).length
  document.getElementById('progTotalDays').textContent = totalDays
  const totalCards = subjects.reduce((sum, s) => sum + getCards(s).length, 0)
  document.getElementById('progTotalCards').textContent = totalCards
  renderHeatmap()
}

function renderHeatmap() {
  const grid = document.getElementById('heatmapGrid')
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  grid.innerHTML = days.map(dateStr => {
    const done = !!data.streak.history[dateStr]
    const isToday = dateStr === todayStr()
    const d = new Date(dateStr + 'T00:00:00')
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return `<div class="heatmap-cell ${done ? 'done' : ''} ${isToday ? 'is-today' : ''}" title="${label}${done ? ' — studied ✓' : ''}"></div>`
  }).join('')
}

// ── GRADES ──
function renderGrades() {
  updateSubjectLabels()
  const { entries, target } = getGrades(currentSubject)

  // target input
  document.getElementById('gradeTargetInput').value = target !== null ? target : ''

  // stats
  const gradedEntries = entries.filter(e => e.value !== null)
  const avg = gradedEntries.length
    ? Math.round(gradedEntries.reduce((s, e) => s + e.value, 0) / gradedEntries.length * 10) / 10
    : null
  const highest = gradedEntries.length ? Math.max(...gradedEntries.map(e => e.value)) : null
  const lowest  = gradedEntries.length ? Math.min(...gradedEntries.map(e => e.value)) : null

  document.getElementById('gradeAvg').textContent    = avg !== null ? avg + '%' : '—'
  document.getElementById('gradeHighest').textContent = highest !== null ? highest + '%' : '—'
  document.getElementById('gradeLowest').textContent  = lowest !== null ? lowest + '%' : '—'

  // target gap
  const gapEl = document.getElementById('gradeGapBlock')
  if (target !== null && avg !== null) {
    const gap = Math.round((target - avg) * 10) / 10
    gapEl.classList.remove('hidden')
    const gapNum = document.getElementById('gradeGapNum')
    const gapDesc = document.getElementById('gradeGapDesc')
    if (gap <= 0) {
      gapNum.textContent = '✓ On target'
      gapNum.style.color = 'var(--accent)'
      gapDesc.textContent = `You're ${Math.abs(gap)}% above your ${target}% goal`
    } else {
      gapNum.textContent = '+' + gap + '% needed'
      gapNum.style.color = 'var(--danger)'
      gapDesc.textContent = `${gap}% below your ${target}% target`
    }
  } else {
    gapEl.classList.add('hidden')
  }

  // letter grade
  const letterEl = document.getElementById('gradeLetter')
  if (avg !== null) {
    const letter = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'F'
    letterEl.textContent = letter
    letterEl.className = 'grade-letter grade-' + letter
  } else {
    letterEl.textContent = '—'
    letterEl.className = 'grade-letter'
  }

  // entry list
  const list = document.getElementById('gradeList')
  const empty = document.getElementById('gradeEmpty')
  empty.style.display = entries.length === 0 ? 'block' : 'none'
  list.innerHTML = entries.map((e, i) => {
    const isUngraded = e.value === null
    const scoreText = isUngraded
      ? '—'
      : (e.achieved != null ? `${e.achieved}/${e.max}` : `${e.value}%`)
    const pctText = isUngraded ? 'Not graded' : `${e.value}%`
    const valClass = isUngraded ? 'ungraded' : e.value >= (target || 50) ? 'pass' : 'fail'
    return `
    <div class="grade-entry">
      <span class="grade-entry-name">${e.name}</span>
      <span class="grade-entry-pts">${scoreText}</span>
      <span class="grade-entry-val ${valClass}">${pctText}</span>
      <button class="grade-entry-del" onclick="deleteGrade(${i})">×</button>
    </div>
  `}).join('')
}

function addGrade() {
  const name = document.getElementById('gradeNameInput').value.trim()
  const achievedRaw = document.getElementById('gradeAchievedInput').value.trim()
  const maxRaw = document.getElementById('gradeMaxInput').value.trim()

  if (!name) { showError('Please enter an assessment name.'); return }

  // allow '—' or '-' for not graded
  const notGraded = achievedRaw === '—' || achievedRaw === '-'
  let value = null
  if (!notGraded) {
    const achieved = parseFloat(achievedRaw)
    const max = parseFloat(maxRaw)
    if (isNaN(achieved) || isNaN(max) || max <= 0) { showError('Enter valid points — e.g. 45 out of 60.'); return }
    if (achieved > max) { showError('Achieved points can\'t exceed max points.'); return }
    value = Math.round((achieved / max) * 1000) / 10 // one decimal %
  }

  getGrades(currentSubject).entries.push({ name, value, achieved: notGraded ? null : parseFloat(achievedRaw), max: notGraded ? null : parseFloat(maxRaw) })
  document.getElementById('gradeNameInput').value = ''
  document.getElementById('gradeAchievedInput').value = ''
  document.getElementById('gradeMaxInput').value = ''
  document.getElementById('gradeNameInput').focus()
  renderGrades()
  scheduleSave()
}

function deleteGrade(i) {
  getGrades(currentSubject).entries.splice(i, 1)
  renderGrades()
  scheduleSave()
}

function setGradeTarget() {
  const val = parseFloat(document.getElementById('gradeTargetInput').value)
  getGrades(currentSubject).target = isNaN(val) ? null : Math.min(100, Math.max(0, val))
  renderGrades()
  scheduleSave()
}

// ── SETTINGS PANEL ──
function renderSettingsPanel() {
  const { theme, accent } = data.settings

  // theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme)
    btn.onclick = () => {
      data.settings.theme = btn.dataset.theme
      applyTheme()
      renderSettingsPanel()
      scheduleSave()
    }
  })

  // preset swatches
  const swatchContainer = document.getElementById('accentSwatches')
  swatchContainer.innerHTML = ACCENT_PRESETS.map(color => `
    <button class="swatch ${accent === color ? 'active' : ''}"
      style="background:${color}"
      onclick="setAccent('${color}')"></button>
  `).join('')

  // color picker sync
  document.getElementById('accentPicker').value = accent
}

function setAccent(color) {
  data.settings.accent = color
  applyTheme()
  renderSettingsPanel()
  scheduleSave()
}


// ── ERROR TOAST ──
let errorTimer = null
function showError(msg) {
  const toast = document.getElementById('errorToast')
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(errorTimer)
  errorTimer = setTimeout(() => toast.classList.remove('show'), 3000)
}

// ── SYMBOL PICKER ──
const SYMBOLS = [
  { label: 'Greek', chars: ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','π','ρ','σ','τ','υ','φ','χ','ψ','ω','Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Λ','Μ','Ν','Ξ','Π','Σ','Υ','Φ','Χ','Ψ','Ω'] },
  { label: 'Math', chars: ['±','×','÷','≠','≈','≡','≤','≥','∞','√','∛','∑','∏','∫','∂','∇','∆','∈','∉','⊂','⊃','∪','∩','∀','∃','¬','∧','∨','⊕','∝','∴','∵'] },
  { label: 'Arrows', chars: ['→','←','↑','↓','↔','↕','⇒','⇐','⇔','⟹','⟺','↦','↗','↘'] },
  { label: 'Misc', chars: ['°','′','″','‰','Å','ℏ','ℝ','ℤ','ℚ','ℕ','ℂ','℃','℉','μ','Ω'] }
]

let symbolPickerOpen = false

function toggleSymbolPicker() {
  const picker = document.getElementById('symbolPicker')
  symbolPickerOpen = !symbolPickerOpen
  picker.classList.toggle('hidden', !symbolPickerOpen)
  if (symbolPickerOpen) renderSymbolPicker()
}

function renderSymbolPicker() {
  const picker = document.getElementById('symbolPicker')
  picker.innerHTML = SYMBOLS.map(group => `
    <div class="sym-group-label">${group.label}</div>
    <div class="sym-group">
      ${group.chars.map(c => `<button class="sym-btn" onmousedown="insertSymbol(event,'${c}')">${c}</button>`).join('')}
    </div>
  `).join('')
}

function insertSymbol(e, char) {
  e.preventDefault()
  const editor = document.getElementById('notesArea')
  editor.focus()
  document.execCommand('insertText', false, char)
  // keep picker open for multiple inserts
}

// close symbol picker when clicking outside
document.addEventListener('click', e => {
  if (symbolPickerOpen &&
      !e.target.closest('#symbolPicker') &&
      e.target.id !== 'symbolPickerBtn') {
    symbolPickerOpen = false
    document.getElementById('symbolPicker').classList.add('hidden')
  }
})

// ── STREAK MILESTONES ──
const MILESTONES = { 7: '🔥 7 day streak!', 14: '💪 2 week streak!', 30: '🏆 30 day streak!', 60: '⚡ 60 days!', 100: '👑 100 day streak!' }
let milestoneTimer = null

function checkStreakMilestone(count) {
  if (!MILESTONES[count]) return
  const widget = document.getElementById('streakWidget')
  const msg = document.getElementById('streakMilestoneMsg')
  msg.textContent = MILESTONES[count]
  widget.classList.add('milestone')
  clearTimeout(milestoneTimer)
  milestoneTimer = setTimeout(() => widget.classList.remove('milestone'), 4000)
}

function applyAlignment(cmd) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const anchorEl = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)
  if (!anchorEl) return
  const imgWrap = anchorEl.closest('.img-wrap')
  if (imgWrap) {
    const map = { justifyLeft: 'left', justifyCenter: 'center', justifyRight: 'right', justifyFull: 'justify' }
    imgWrap.style.textAlign = map[cmd] || 'left'
    onNotesInput()
    return
  }
  document.execCommand(cmd, false, null)
}

function openImagePicker() {
  const input = document.getElementById('imageInput')
  input.value = ''
  input.click()
}

function onImagePicked(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => insertImageAtCursor(ev.target.result)
  reader.readAsDataURL(file)
}

function insertImageAtCursor(src) {
  const editor = document.getElementById('notesArea')
  editor.focus()
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return
  const wrap = document.createElement('div')
  wrap.className = 'img-wrap'
  wrap.style.textAlign = 'left'
  const inner = document.createElement('div')
  inner.className = 'img-inner'
  const img = document.createElement('img')
  img.src = src
  img.style.width = '320px'
  img.style.maxWidth = '100%'
  img.style.display = 'block'
  img.alt = 'note image'
  inner.appendChild(img)
  wrap.appendChild(inner)
  range.insertNode(wrap)
  range.setStartAfter(wrap)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  onNotesInput()
}

function onEditorContextMenu(e) {
  const img = e.target.closest('img')
  if (!img) return
  e.preventDefault()
  selectedImageElement = img
  showCtxMenu(e, 'imageCtxMenu')
}

function applyImageAction(action) {
  if (!selectedImageElement) return
  const img = selectedImageElement
  const wrap = img.closest('.img-wrap')
  if (action === 'delete-image') {
    if (wrap) wrap.remove()
    else img.remove()
    clearImageSelection()
    hideAllMenus()
    onNotesInput()
    return
  }
  hideAllMenus()
  onNotesInput()
}

function onEditorClick(e) {
  const editor = document.getElementById('notesArea')
  const img = e.target.closest && e.target.closest('img')
  const handle = e.target.closest && e.target.closest('.img-resize-handle')
  if (handle) return
  if (img && editor.contains(img)) {
    const wrap = img.closest('.img-wrap')
    if (wrap) selectImageWrap(wrap)
    return
  }
  if (!e.target.closest || !e.target.closest('.img-wrap')) clearImageSelection()
}

function selectImageWrap(wrap) {
  clearImageSelection()
  selectedImageWrap = wrap
  wrap.classList.add('img-selected')
  const inner = wrap.querySelector('.img-inner')
  if (!inner) return
  if (!inner.querySelector('.img-resize-handle')) {
    const h = document.createElement('span')
    h.className = 'img-resize-handle'
    h.title = 'Drag to resize'
    inner.appendChild(h)
    h.addEventListener('mousedown', onImageResizeHandleDown)
  }
}

function clearImageSelection() {
  if (selectedImageWrap) {
    selectedImageWrap.classList.remove('img-selected')
    selectedImageWrap = null
  }
}

function onImageResizeHandleDown(e) {
  e.preventDefault()
  e.stopPropagation()
  const handle = e.currentTarget
  const inner = handle.closest('.img-inner')
  const img = inner && inner.querySelector('img')
  if (!img) return
  const rect = img.getBoundingClientRect()
  imageResizeDrag = {
    img,
    startX: e.clientX,
    startW: rect.width
  }
  document.body.style.userSelect = 'none'
}

function onImageResizeMove(e) {
  if (!imageResizeDrag) return
  const dx = e.clientX - imageResizeDrag.startX
  const next = Math.max(80, Math.min(1200, imageResizeDrag.startW + dx))
  imageResizeDrag.img.style.width = `${Math.round(next)}px`
  imageResizeDrag.img.style.maxWidth = '100%'
}

function onImageResizeUp() {
  if (!imageResizeDrag) return
  imageResizeDrag = null
  document.body.style.userSelect = ''
  onNotesInput()
}

function migrateImageWraps(editor) {
  editor.querySelectorAll('.img-wrap').forEach(wrap => {
    if (wrap.querySelector('.img-inner')) return
    const img = wrap.querySelector('img')
    if (!img) return
    const inner = document.createElement('div')
    inner.className = 'img-inner'
    wrap.insertBefore(inner, img)
    inner.appendChild(img)
  })
}

function hydrateEditorEntities(editor) {
  migrateImageWraps(editor)
}

function applySidebarWidthFromSettings() {
  const w = data.settings.sidebarWidth
  if (typeof w === 'number' && w >= 170 && w <= 420) {
    document.documentElement.style.setProperty('--sidebar-width', `${Math.round(w)}px`)
  }
}

function initSidebarResize() {
  const handle = document.getElementById('sidebarResizer')
  const sidebar = document.getElementById('sidebar')
  if (!handle || !sidebar) return
  handle.addEventListener('mousedown', e => {
    sidebarResizeState = { startX: e.clientX, startWidth: sidebar.getBoundingClientRect().width }
    handle.classList.add('dragging')
    document.body.style.userSelect = 'none'
  })
  window.addEventListener('mousemove', e => {
    if (!sidebarResizeState) return
    const next = Math.max(170, Math.min(420, sidebarResizeState.startWidth + (e.clientX - sidebarResizeState.startX)))
    document.documentElement.style.setProperty('--sidebar-width', `${Math.round(next)}px`)
  })
  window.addEventListener('mouseup', () => {
    if (!sidebarResizeState) return
    const px = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'), 10)
    if (!isNaN(px)) {
      data.settings.sidebarWidth = px
      scheduleSave()
    }
    sidebarResizeState = null
    handle.classList.remove('dragging')
    document.body.style.userSelect = ''
  })
}
