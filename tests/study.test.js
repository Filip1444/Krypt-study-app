const test = require('node:test')
const assert = require('node:assert/strict')
const { rateFlashcard, updateFlashcard, deleteSubjectData, restoreSubjectData } = require('../src/study-logic')
const { remainingSeconds } = require('../src/study-logic')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

test('calendar day keys respect local midnight and daylight-saving transitions', () => {
  const modulePath = path.resolve(__dirname, '../src/study-logic.js')
  const cases = [
    ['Europe/Zagreb', '2026-09-30T22:30:00Z', '2026-10-01'],
    ['America/New_York', '2026-10-01T02:30:00Z', '2026-09-30'],
    ['Europe/Zagreb', '2026-03-29T22:30:00Z', '2026-03-30'],
    ['Europe/Zagreb', '2026-10-25T23:30:00Z', '2026-10-26']
  ]
  for (const [timezone, instant, expected] of cases) {
    const result = execFileSync(process.execPath, ['-e', `const {localDay}=require(${JSON.stringify(modulePath)});const now=new Date(${JSON.stringify(instant)});console.log(localDay(now));now.setDate(now.getDate()-1);console.log(localDay(now));`], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' }).trim().split(/\r?\n/)
    assert.equal(result[0], expected)
    const previous = new Date(expected + 'T12:00:00Z')
    previous.setUTCDate(previous.getUTCDate() - 1)
    assert.equal(result[1], previous.toISOString().slice(0, 10))
  }
})

test('timer uses elapsed wall time and handles callbacks delayed beyond its deadline', () => {
  assert.equal(remainingSeconds(1500000, 0), 1500)
  assert.equal(remainingSeconds(1500000, 600001), 900)
  assert.equal(remainingSeconds(1500000, 1500000), 0)
  assert.equal(remainingSeconds(1500000, 3000000), 0)
})

test('flashcard edits preserve or explicitly reset review progress', () => {
  const card = { id: 'c1', front: 'old', back: 'old', group: 'General', due: 900, interval: 8, ease: 2.2 }
  updateFlashcard(card, 'new', 'answer', 'Chapter 2', false, 1000)
  assert.deepEqual([card.front, card.back, card.group, card.due, card.interval, card.ease], ['new', 'answer', 'Chapter 2', 900, 8, 2.2])
  updateFlashcard(card, 'new', 'answer', 'Chapter 2', true, 1000)
  assert.deepEqual([card.due, card.interval, card.ease], [1000, 1, 2.5])
})

test('review scheduling handles good and again ratings', () => {
  const card = { interval: 2, ease: 2.5, due: 0 }
  rateFlashcard(card, true, 1000)
  assert.equal(card.interval, 5)
  assert.equal(card.due, 1000 + 5 * 86400000)
  rateFlashcard(card, false, 2000)
  assert.equal(card.interval, 1)
  assert.equal(card.due, 62000)
})

test('subject deletion and undo restore every subject collection and its position', () => {
  const subjects = ['A', 'B', 'C']
  const data = { notes: { B: [{ id: 'n' }] }, tasks: { B: [{ text: 'x' }] }, flashcards: { B: [{ id: 'c' }] }, grades: { B: { entries: [] } }, subjectColors: { B: '#fff' } }
  const before = structuredClone(data)
  const snapshot = deleteSubjectData(subjects, data, 'B')
  assert.deepEqual(subjects, ['A', 'C'])
  assert.equal(data.notes.B, undefined)
  assert.equal(restoreSubjectData(subjects, data, snapshot), true)
  assert.deepEqual(subjects, ['A', 'B', 'C'])
  assert.deepEqual(data, before)
})
