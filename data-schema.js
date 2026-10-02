const SCHEMA_VERSION = 1

function safeStructure(value) {
  const seen = new WeakSet()
  const pending = [value]
  while (pending.length) {
    const item = pending.pop()
    if (!item || typeof item !== 'object') continue
    if (seen.has(item)) return false
    seen.add(item)
    for (const key of Object.keys(item)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) return false
      pending.push(item[key])
    }
  }
  return true
}

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validData(value) {
  const isMap = item => item && typeof item === 'object' && !Array.isArray(item)
  const allRows = (item, check) => isMap(item) && Object.values(item).every(rows => Array.isArray(rows) && rows.every(row => isMap(row) && check(row)))
  const optional = (item, key, check) => item[key] === undefined || check(item[key])
  const numeric = n => Number.isFinite(n) && n >= 0
  const counter = n => Number.isSafeInteger(n) && n >= 0
  const nullableNumber = n => n === null || numeric(n)
  const group = row => optional(row, 'group', g => typeof g === 'string')
  const uniqueIds = map => Object.values(map).every(rows => new Set(rows.map(row => row.id)).size === rows.length)
  return isMap(value) && safeStructure(value) && value.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(value.subjects) && value.subjects.length > 0 && value.subjects.every(s => typeof s === 'string' && s.length > 0 && !['__proto__', 'prototype', 'constructor'].includes(s)) &&
    new Set(value.subjects).size === value.subjects.length &&
    allRows(value.notes, f => typeof f.id === 'string' && f.id.length > 0 && typeof f.name === 'string' && typeof f.content === 'string' && group(f) && optional(f, 'updatedAt', numeric)) && uniqueIds(value.notes) &&
    allRows(value.tasks, t => typeof t.text === 'string' && optional(t, 'done', n => typeof n === 'boolean') && optional(t, 'status', s => ['todo', 'in_progress', 'done'].includes(s)) && optional(t, 'recurring', s => [null, '', 'daily', 'weekly'].includes(s)) && optional(t, 'completedAt', nullableNumber)) &&
    allRows(value.flashcards, c => typeof c.id === 'string' && c.id.length > 0 && typeof c.front === 'string' && typeof c.back === 'string' && group(c) && optional(c, 'due', nullableNumber) && optional(c, 'interval', numeric) && optional(c, 'ease', numeric)) && uniqueIds(value.flashcards) &&
    isMap(value.grades) && Object.values(value.grades).every(g => isMap(g) && optional(g, 'targetScore', n => n === null || (numeric(n) && n <= 1)) && optional(g, 'target', nullableNumber) && Array.isArray(g.entries) && g.entries.every(e => isMap(e) && typeof e.name === 'string' && optional(e, 'gradeScore', n => n === null || (numeric(n) && n <= 1)) && optional(e, 'percentage', n => n === null || (numeric(n) && n <= 100)) && optional(e, 'value', numeric))) &&
    Array.isArray(value.schedule) && value.schedule.every(t => isMap(t) && typeof t.name === 'string' && typeof t.subject === 'string' && validDay(t.date)) &&
    isMap(value.streak) && counter(value.streak.count) && (value.streak.lastDate === null || validDay(value.streak.lastDate)) && isMap(value.streak.history) && Object.entries(value.streak.history).every(([day, done]) => validDay(day) && typeof done === 'boolean') &&
    isMap(value.subjectColors) && Object.values(value.subjectColors).every(c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) &&
    isMap(value.reviewLog) && Object.entries(value.reviewLog).every(([day, log]) => validDay(day) && isMap(log) && counter(log.total) && counter(log.correct) && log.correct <= log.total) &&
    isMap(value.settings) && optional(value.settings, 'language', s => ['en', 'hr'].includes(s)) && optional(value.settings, 'theme', s => ['dark', 'light'].includes(s)) && optional(value.settings, 'accent', s => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s)) && optional(value.settings, 'sidebarWidth', n => Number.isFinite(n) && n >= 170 && n <= 420) && optional(value.settings, 'taskView', s => ['list', 'kanban'].includes(s)) && optional(value.settings, 'gradingSystem', s => ['F-A', '1-5', '5-1', '1-10', '10-1'].includes(s))
}

function migrateData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !safeStructure(value)) throw new Error('Saved data has an invalid structure.')
  const version = value.schemaVersion ?? 0
  if (!Number.isInteger(version) || version < 0 || version > SCHEMA_VERSION) throw new Error('This data uses an unsupported schema version.')
  if (version === SCHEMA_VERSION) {
    if (!validData(value)) throw new Error('Saved data has an invalid structure.')
    return value
  }
  if (!Array.isArray(value.subjects)) throw new Error('Legacy data has no subject list.')
  const migrated = {
    ...value,
    schemaVersion: SCHEMA_VERSION,
    notes: value.notes ?? {},
    tasks: value.tasks ?? {},
    schedule: value.schedule ?? [],
    flashcards: value.flashcards ?? {},
    streak: value.streak ?? { count: 0, lastDate: null, history: {} },
    grades: value.grades ?? {},
    subjectColors: value.subjectColors ?? {},
    reviewLog: value.reviewLog ?? {},
    settings: value.settings ?? {}
  }
  if (!validData(migrated)) throw new Error('Legacy data has an invalid structure.')
  return migrated
}

module.exports = { SCHEMA_VERSION, validData, migrateData }
