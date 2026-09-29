const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')

let mainWindow = null
const configPath = path.join(app.getPath('userData'), 'krypt-settings.json')
let dataDirectory = app.getPath('userData')
let saveQueue = Promise.resolve()
const SNAPSHOT_LIMIT = 10

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectory, { recursive: true })
}
function dataPaths() {
  return {
    primary: path.join(dataDirectory, 'krypt-data.json'),
    backup: path.join(dataDirectory, 'krypt-data.json.backup'),
    legacyBackup: path.join(dataDirectory, 'krypt-data.json.backup.json'),
    snapshots: path.join(dataDirectory, 'backups')
  }
}
function validData(value) {
  const seen = new WeakSet()
  const safeKeys = item => {
    if (!item || typeof item !== 'object') return true
    if (seen.has(item)) return false
    seen.add(item)
    if (Array.isArray(item)) return item.every(safeKeys)
    return Object.keys(item).every(key => !['__proto__', 'prototype', 'constructor'].includes(key) && safeKeys(item[key]))
  }
  const isMap = item => item && typeof item === 'object' && !Array.isArray(item)
  const allRows = (item, check) => isMap(item) && Object.values(item).every(rows => Array.isArray(rows) && rows.every(row => isMap(row) && check(row)))
  return !!value && typeof value === 'object' && !Array.isArray(value) && safeKeys(value) &&
    Array.isArray(value.subjects) && value.subjects.every(s => typeof s === 'string' && !['__proto__', 'prototype', 'constructor'].includes(s)) &&
    allRows(value.notes, f => typeof f.id === 'string' && typeof f.name === 'string' && typeof f.content === 'string') &&
    allRows(value.tasks, t => typeof t.text === 'string') &&
    allRows(value.flashcards, c => typeof c.id === 'string' && typeof c.front === 'string' && typeof c.back === 'string') &&
    isMap(value.grades) && Object.values(value.grades).every(g => isMap(g) && Array.isArray(g.entries) && g.entries.every(e => isMap(e) && typeof e.name === 'string')) &&
    Array.isArray(value.schedule) && value.schedule.every(t => isMap(t) && typeof t.name === 'string' && typeof t.subject === 'string' && typeof t.date === 'string') &&
    isMap(value.streak) && isMap(value.streak.history)
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}
function loadData() {
  ensureDataDirectory()
  const { primary, backup, legacyBackup } = dataPaths()
  const existsPrimary = fs.existsSync(primary)
  const backupFiles = [backup, legacyBackup].filter(file => fs.existsSync(file))
  if (!existsPrimary && backupFiles.length === 0) return { status: 'empty', data: null }
  let primaryError = null
  if (existsPrimary) {
    try {
      const data = readJson(primary)
      if (!validData(data)) throw new Error('Saved data has an invalid structure.')
      return { status: 'ok', data }
    } catch (error) { primaryError = error.message }
  }
  const backupErrors = []
  for (const backupFile of backupFiles) {
    try {
      const data = readJson(backupFile)
      if (!validData(data)) throw new Error('Backup has an invalid structure.')
      return { status: 'recovered', data, message: primaryError || 'The main data file is missing.' }
    } catch (error) { backupErrors.push(error.message) }
  }
  if (backupFiles.length) return { status: 'unreadable', message: 'Neither the main data file nor its backup could be read.', primaryError, backupError: backupErrors.join('; ') }
  return { status: 'unreadable', message: 'The main data file could not be read and no backup is available.', primaryError }
}
function rotateSnapshot() {
  const { primary, snapshots } = dataPaths()
  if (!fs.existsSync(primary)) return
  fs.mkdirSync(snapshots, { recursive: true })
  const name = 'krypt-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8) + '.json'
  fs.copyFileSync(primary, path.join(snapshots, name))
  const files = fs.readdirSync(snapshots).filter(f => f.endsWith('.json')).sort().reverse()
  for (const old of files.slice(SNAPSHOT_LIMIT)) fs.unlinkSync(path.join(snapshots, old))
}
function archiveUnreadable(file, label) {
  if (!fs.existsSync(file)) return
  const snapshots = dataPaths().snapshots
  fs.mkdirSync(snapshots, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.copyFileSync(file, path.join(snapshots, `unreadable-${label}-${stamp}.json`))
}
function saveData(data) {
  if (!validData(data)) return false
  saveQueue = saveQueue.then(() => {
    ensureDataDirectory()
    const { primary, backup } = dataPaths()
    const tmp = primary + '.tmp'
    try {
      if (fs.existsSync(primary)) {
        try {
          const previous = readJson(primary)
          if (!validData(previous)) throw new Error('Current data is structurally invalid.')
          rotateSnapshot()
          fs.copyFileSync(primary, backup)
        } catch (error) {
          console.error('Skipping snapshot of unreadable current data:', error)
          archiveUnreadable(primary, 'main')
        }
      }
      if (!fs.existsSync(backup) && fs.existsSync(dataPaths().legacyBackup)) {
        try {
          const legacy = readJson(dataPaths().legacyBackup)
          if (validData(legacy)) fs.copyFileSync(dataPaths().legacyBackup, backup)
        } catch (error) { console.error('Could not migrate the legacy backup:', error) }
      }
      if (fs.existsSync(backup)) {
        try { if (!validData(readJson(backup))) archiveUnreadable(backup, 'backup') }
        catch (_) { archiveUnreadable(backup, 'backup') }
      }
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
      fs.renameSync(tmp, primary)
      return true
    } catch (error) {
      console.error('saveData error:', error)
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp) } catch (_) {}
      return false
    }
  })
  return saveQueue
}
function readConfig() {
  try {
    const config = readJson(configPath)
    if (typeof config.dataDirectory === 'string' && path.isAbsolute(config.dataDirectory)) dataDirectory = config.dataDirectory
  } catch (_) {}
}
function writeConfig() {
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify({ dataDirectory }, null, 2), 'utf8')
}
async function exportData(language) {
  const hr = language === 'hr'
  const result = await dialog.showSaveDialog(mainWindow, {
    title: hr ? 'Izvezi podatke KRYPT-a ili izradi sigurnosnu kopiju' : 'Export or back up KRYPT data',
    defaultPath: path.join(app.getPath('documents'), 'krypt-backup.json'),
    filters: [{ name: hr ? 'Podaci KRYPT-a' : 'KRYPT data', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { canceled: true }
  const loaded = loadData()
  if (!loaded.data) return { error: hr ? 'Nema čitljivih podataka KRYPT-a za izvoz.' : 'There is no readable KRYPT data to export.' }
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(loaded.data, null, 2), 'utf8')
    return { ok: true, path: result.filePath }
  } catch (error) { return { error: error.message } }
}
async function importData(language) {
  const hr = language === 'hr'
  const result = await dialog.showOpenDialog(mainWindow, {
    title: hr ? 'Vrati ili uvezi podatke KRYPT-a' : 'Restore or import KRYPT data',
    properties: ['openFile'],
    filters: [{ name: hr ? 'Podaci i sigurnosne kopije KRYPT-a' : 'KRYPT data and backups', extensions: ['json', 'backup'] }, { name: hr ? 'Sve datoteke' : 'All files', extensions: ['*'] }]
  })
  if (result.canceled || !result.filePaths.length) return { canceled: true }
  try {
    const data = readJson(result.filePaths[0])
    if (!validData(data)) return { error: hr ? 'Ova datoteka nije valjani izvoz podataka KRYPT-a.' : 'This file is not a valid KRYPT data export.' }
    const ok = await saveData(data)
    return ok ? { ok: true, data } : { error: hr ? 'KRYPT nije uspio spremiti uvezene podatke.' : 'KRYPT could not save the imported data.' }
  } catch (error) { return { error: (hr ? 'Nije moguće pročitati sigurnosnu kopiju: ' : 'Could not read this backup: ') + error.message } }
}
async function chooseDataDirectory(language) {
  const hr = language === 'hr'
  const previousDirectory = dataDirectory
  const result = await dialog.showOpenDialog(mainWindow, { title: hr ? 'Odaberi mapu s podacima KRYPT-a' : 'Choose KRYPT data folder', properties: ['openDirectory', 'createDirectory'] })
  if (result.canceled || !result.filePaths.length) return { canceled: true }
  const selectedDirectory = result.filePaths[0]
  const source = path.join(previousDirectory, 'krypt-data.json')
  const destination = path.join(selectedDirectory, 'krypt-data.json')
  if (selectedDirectory !== previousDirectory && fs.existsSync(destination)) return { error: hr ? 'Ta mapa već sadrži podatke KRYPT-a. Odaberite praznu mapu kako ne biste zamijenili drugi radni prostor.' : 'That folder already contains KRYPT data. Choose an empty folder to avoid replacing another workspace.' }
  dataDirectory = selectedDirectory
  ensureDataDirectory()
  if (previousDirectory !== dataDirectory && !fs.existsSync(destination) && fs.existsSync(source)) {
    fs.copyFileSync(source, destination)
    for (const suffix of ['.backup', '.backup.json']) {
      const backup = source + suffix
      if (fs.existsSync(backup)) fs.copyFileSync(backup, destination + '.backup')
    }
  }
  writeConfig()
  return { ok: true, path: dataDirectory }
}
async function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 720,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: false
    }
  })
  mainWindow = win
  win.on('closed', () => { mainWindow = null })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', event => event.preventDefault())
  Menu.setApplicationMenu(null)
  await win.loadFile('src/index.html')
  win.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase()
    const command = input.control || input.meta
    if (key === 'f12' || (command && key === 'u') || (command && input.shift && ['i', 'j', 'c'].includes(key))) {
      event.preventDefault()
    }
  })
}
readConfig()
ipcMain.handle('krypt:load', () => loadData())
ipcMain.handle('krypt:save', (_, value) => saveData(value))
ipcMain.handle('krypt:export', (_, language) => exportData(language))
ipcMain.handle('krypt:import', (_, language) => importData(language))
ipcMain.handle('krypt:choose-directory', (_, language) => chooseDataDirectory(language))
ipcMain.handle('krypt:show-directory', async () => {
  ensureDataDirectory()
  return shell.openPath(dataDirectory)
})
ipcMain.handle('krypt:get-directory', () => dataDirectory)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
