(() => {
  function localDay(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function remainingSeconds(deadline, now = Date.now()) {
    return Math.max(0, Math.ceil((deadline - now) / 1000))
  }
  function rateFlashcard(card, gotIt, now = Date.now()) {
    const ease = Number.isFinite(card.ease) ? card.ease : 2.5
    const interval = Number.isFinite(card.interval) && card.interval > 0 ? card.interval : 1
    if (gotIt) {
      card.ease = Math.max(1.3, ease + 0.1)
      card.interval = Math.round(interval * card.ease)
      card.due = now + card.interval * 86400000
    } else {
      card.interval = 1
      card.ease = Math.max(1.3, ease - 0.2)
      card.due = now + 60000
    }
    return card
  }

  function updateFlashcard(card, front, back, group, resetProgress, now = Date.now()) {
    card.front = front
    card.back = back
    card.group = group
    if (resetProgress) {
      card.due = now
      card.interval = 1
      card.ease = 2.5
    }
    return card
  }

  function deleteSubjectData(subjects, data, name) {
    const index = subjects.indexOf(name)
    if (index < 0) return null
    const snapshot = {
      index, name,
      notes: data.notes[name], tasks: data.tasks[name], flashcards: data.flashcards[name],
      grades: data.grades[name], subjectColors: data.subjectColors[name]
    }
    subjects.splice(index, 1)
    for (const key of ['notes', 'tasks', 'flashcards', 'grades', 'subjectColors']) delete data[key][name]
    return snapshot
  }

  function restoreSubjectData(subjects, data, snapshot) {
    if (!snapshot || subjects.includes(snapshot.name)) return false
    subjects.splice(Math.min(snapshot.index, subjects.length), 0, snapshot.name)
    for (const key of ['notes', 'tasks', 'flashcards', 'grades', 'subjectColors']) {
      if (snapshot[key] !== undefined) data[key][snapshot.name] = snapshot[key]
    }
    return true
  }

  const api = { localDay, remainingSeconds, rateFlashcard, updateFlashcard, deleteSubjectData, restoreSubjectData }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else window.KryptStudy = api
})()
