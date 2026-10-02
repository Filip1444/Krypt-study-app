const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const { migrateData, validData } = require('../data-schema')

function legacyData() {
  return {
    subjects: ['Mathematics'], notes: { Mathematics: [{ id: 'n1', name: 'Note', content: 'hello' }] },
    tasks: { Mathematics: [] }, schedule: [], flashcards: { Mathematics: [] },
    streak: { count: 0, lastDate: null, history: {} }, grades: {}, subjectColors: {}, reviewLog: {}, settings: {}
  }
}

function mainHandlers(folder, options = {}) {
  const handlers = new Map()
  const appEvents = new Map()
  const ipcEvents = new Map()
  const electron = {
    app: { requestSingleInstanceLock: () => true, quit: () => {}, getPath: () => folder, whenReady: () => new Promise(() => {}), on: (name, fn) => appEvents.set(name, fn), ...options.app },
    BrowserWindow: options.BrowserWindow || class {}, Menu: { setApplicationMenu() {} }, ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => ipcEvents.set(name, fn) },
    dialog: options.dialog || {}, shell: {}
  }
  const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8')
  const context = vm.createContext({
    require: name => name === 'electron' ? electron : name === './data-schema' ? require('../data-schema') : name === 'fs' ? options.fs || fs : require(name),
    __dirname: path.join(__dirname, '..'), console: options.console || console, process,
    setTimeout: options.setTimeout || setTimeout, clearTimeout: options.clearTimeout || clearTimeout
  })
  vm.runInContext(source, context, { filename: 'main.js' })
  handlers.run = code => vm.runInContext(code, context)
  handlers.appEvents = appEvents
  handlers.ipcEvents = ipcEvents
  return handlers
}

function temporaryFolder(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'krypt-test-'))
  t.after(() => {
    assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep))
    assert(path.basename(folder).startsWith('krypt-test-'))
    fs.rmSync(folder, { recursive: true, force: true })
  })
  return folder
}

test('legacy workspaces migrate without changing note content; future schemas are rejected', () => {
  const old = legacyData()
  const migrated = migrateData(old)
  assert.equal(migrated.schemaVersion, 1)
  assert.equal(migrated.notes.Mathematics[0].content, 'hello')
  assert.equal(validData(migrated), true)
  assert.equal(old.schemaVersion, undefined)
  assert.throws(() => migrateData({ ...old, schemaVersion: 99 }), /unsupported schema/)
  assert.throws(() => migrateData(JSON.parse('{"subjects":["x"],"notes":{"__proto__":{}}}')), /invalid structure/)
})

test('save, backup recovery, and invalid save guard', async t => {
  const folder = temporaryFolder(t)
  const handlers = mainHandlers(folder)
  const load = () => handlers.get('krypt:load')()
  const save = data => handlers.get('krypt:save')(null, data)
  assert.equal(load().status, 'empty')
  const first = migrateData(legacyData())
  assert.equal(await save(first), true)
  assert.equal(load().data.notes.Mathematics[0].content, 'hello')
  const second = structuredClone(first)
  second.notes.Mathematics[0].content = 'updated'
  assert.equal(await save(second), true)
  assert.equal(load().data.notes.Mathematics[0].content, 'updated')
  assert.equal(await save({ ...second, schemaVersion: 99 }), false)
  fs.writeFileSync(path.join(folder, 'krypt-data.json'), '{broken', 'utf8')
  const recovered = load()
  assert.equal(recovered.status, 'recovered')
  assert.equal(recovered.data.notes.Mathematics[0].content, 'hello')
})

test('save retries recover after transient directory failure', async t => {
  const folder = temporaryFolder(t)
  let fail = true
  const faultFs = Object.create(fs)
  faultFs.mkdirSync = (...args) => {
    if (fail) throw new Error('Injected directory failure')
    return fs.mkdirSync(...args)
  }
  const handlers = mainHandlers(folder, { fs: faultFs, console: { error() {} } })
  const save = value => handlers.get('krypt:save')(null, value)
  assert.equal(await save(migrateData(legacyData())), false)
  fail = false
  assert.equal(await save(migrateData(legacyData())), true)
  assert.equal(handlers.get('krypt:load')().status, 'ok')
})

test('a second process quits before readiness or window creation', t => {
  let quit = false
  let ready = false
  mainHandlers(temporaryFolder(t), { app: {
    requestSingleInstanceLock: () => false,
    quit: () => { quit = true },
    whenReady: () => { ready = true; return Promise.resolve() }
  } })
  assert.equal(quit, true)
  assert.equal(ready, false)
})

test('directory switch preserves modern backup and snapshots and persists its path', async t => {
  const root = temporaryFolder(t)
  const destination = path.join(root, 'destination')
  const handlers = mainHandlers(root, { dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [destination] }) } })
  const first = migrateData(legacyData())
  await handlers.get('krypt:save')(null, first)
  const second = structuredClone(first)
  second.notes.Mathematics[0].content = 'latest'
  await handlers.get('krypt:save')(null, second)
  const ancient = structuredClone(first)
  ancient.notes.Mathematics[0].content = 'ancient'
  fs.writeFileSync(path.join(root, 'krypt-data.json.backup.json'), JSON.stringify(ancient))
  assert.equal((await handlers.get('krypt:choose-directory')(null, 'en')).ok, true)
  assert.equal(JSON.parse(fs.readFileSync(path.join(destination, 'krypt-data.json.backup'))).notes.Mathematics[0].content, 'hello')
  assert.equal(handlers.get('krypt:load')().data.notes.Mathematics[0].content, 'latest')
  assert.equal(fs.readdirSync(path.join(destination, 'backups')).length, 1)
  assert.equal(mainHandlers(root).get('krypt:get-directory')(), destination)
})

for (const failure of ['copy', 'config']) test(`failed ${failure} rolls back folder selection and allows retry`, async t => {
  const root = temporaryFolder(t)
  const destination = path.join(root, 'destination')
  let fail = true
  const faultFs = Object.create(fs)
  faultFs.copyFileSync = (...args) => {
    if (fail && failure === 'copy' && args[1].startsWith(destination + path.sep)) {
      fs.writeFileSync(args[1], 'partial copy')
      throw new Error('Injected copy failure')
    }
    return fs.copyFileSync(...args)
  }
  faultFs.renameSync = (from, to) => {
    if (fail && failure === 'config' && to.endsWith('krypt-settings.json')) throw new Error('Injected config failure')
    return fs.renameSync(from, to)
  }
  const handlers = mainHandlers(root, { fs: faultFs, dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [destination] }) } })
  fs.writeFileSync(path.join(root, 'krypt-data.json'), JSON.stringify(migrateData(legacyData())))
  fs.copyFileSync(path.join(root, 'krypt-data.json'), path.join(root, 'krypt-data.json.backup'))
  assert.match((await handlers.get('krypt:choose-directory')(null, 'en')).error, /Injected/)
  assert.equal(handlers.get('krypt:get-directory')(), root)
  assert.equal(fs.existsSync(path.join(destination, 'krypt-data.json')), false)
  assert.equal(fs.readdirSync(destination).filter(name => name.endsWith('.tmp')).length, 0)
  assert.equal(await handlers.get('krypt:save')(null, migrateData(legacyData())), true)
  fail = false
  assert.equal((await handlers.get('krypt:choose-directory')(null, 'en')).ok, true)
})

test('folder chooser refuses a destination with only recovery data', async t => {
  const root = temporaryFolder(t)
  const destination = path.join(root, 'destination')
  fs.mkdirSync(destination)
  const backup = path.join(destination, 'krypt-data.json.backup')
  fs.writeFileSync(backup, 'keep me')
  const handlers = mainHandlers(root, { dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [destination] }) } })
  assert.match((await handlers.get('krypt:choose-directory')(null, 'en')).error, /already contains/)
  assert.equal(fs.readFileSync(backup, 'utf8'), 'keep me')
  assert.equal(handlers.get('krypt:get-directory')(), root)
})

test('validation rejects injected counters, invalid dates, duplicate identities and nested bad types', () => {
  const mutations = [
    data => { data.reviewLog['2026-10-01'] = { total: 1, correct: '\"><div>Injected</div>' } },
    data => { data.reviewLog['2026-10-01'] = { total: 1, correct: 2 } },
    data => { data.reviewLog['2026-02-30'] = { total: 1, correct: 1 } },
    data => { data.subjects.push(data.subjects[0]) },
    data => { data.notes.Mathematics.push({ ...data.notes.Mathematics[0] }) },
    data => { data.notes.Mathematics[0].group = {} },
    data => { data.schedule.push({ name: 'Exam', subject: 'Math', date: 'not a date' }) },
    data => { data.settings.accent = {} }
  ]
  for (const mutate of mutations) {
    const data = migrateData(legacyData())
    mutate(data)
    assert.equal(validData(data), false)
    assert.throws(() => migrateData(data), /invalid structure/)
  }
  const data = migrateData({ subjects: ['toString', 'hasOwnProperty'] })
  assert.equal(validData(data), true)
})

test('closing an unresponsive renderer offers recovery and never silently discards edits', async t => {
  const events = new Map(), webEvents = new Map()
  let watchdog, dialogOptions, destroyed = false, focused = false
  class Window {
    constructor() { this.webContents = { on: (name, fn) => webEvents.set(name, fn), setWindowOpenHandler() {}, isLoading: () => false, send() {} } }
    on(name, fn) { events.set(name, fn) }
    async loadFile() {}
    destroy() { destroyed = true }
    isMinimized() { return true }
    restore() {}
    show() {}
    focus() { focused = true }
  }
  let response = 1
  const handlers = mainHandlers(temporaryFolder(t), { BrowserWindow: Window,
    setTimeout: callback => { watchdog = callback; return 1 }, clearTimeout() {},
    dialog: { showMessageBox: async (_, options) => { dialogOptions = options; return { response } } }
  })
  await handlers.run('createWindow()')
  handlers.appEvents.get('second-instance')()
  assert.equal(focused, true)
  let prevented = false
  events.get('close')({ preventDefault: () => { prevented = true } })
  assert.equal(prevented, true)
  watchdog()
  await new Promise(resolve => setImmediate(resolve))
  assert.match(dialogOptions.message, /not responding/)
  assert.equal(destroyed, false)
  assert.equal(handlers.run('closeRequested'), false)
  response = 2
  events.get('close')({ preventDefault() {} })
  watchdog()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(destroyed, true)
  let blocked = false
  webEvents.get('before-input-event')({ preventDefault: () => { blocked = true } }, { key: 'u', control: true })
  assert.equal(blocked, false)
})
