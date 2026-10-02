const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const { validData, migrateData } = require('./data-schema')

let mainWindow = null
let closeRequested = false
let closeAllowed = false
let closeTimer = null
let closeDialogOpen = false
const ownsInstance = app.requestSingleInstanceLock()
if (!ownsInstance) app.quit()
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
      const data = migrateData(readJson(primary))
      return { status: 'ok', data }
    } catch (error) { primaryError = error.message }
  }
  const backupErrors = []
  for (const backupFile of backupFiles) {
    try {
      const data = migrateData(readJson(backupFile))
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
  const files = fs.readdirSync(snapshots).filter(f => f.startsWith('krypt-') && f.endsWith('.json')).sort().reverse()
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
  saveQueue = saveQueue.catch(() => {}).then(() => {
    let tmp
    try {
      ensureDataDirectory()
      const { primary, backup } = dataPaths()
      tmp = primary + '.tmp'
      if (fs.existsSync(primary)) {
        try {
          migrateData(readJson(primary))
          rotateSnapshot()
          fs.copyFileSync(primary, backup)
        } catch (error) {
          console.error('Skipping snapshot of unreadable current data:', error)
          archiveUnreadable(primary, 'main')
        }
      }
      if (!fs.existsSync(backup) && fs.existsSync(dataPaths().legacyBackup)) {
        try {
          migrateData(readJson(dataPaths().legacyBackup))
          fs.copyFileSync(dataPaths().legacyBackup, backup)
        } catch (error) { console.error('Could not migrate the legacy backup:', error) }
      }
      if (fs.existsSync(backup)) {
        try { migrateData(readJson(backup)) }
        catch (_) { archiveUnreadable(backup, 'backup') }
      }
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
      fs.renameSync(tmp, primary)
      return true
    } catch (error) {
      console.error('saveData error:', error)
      try { if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp) } catch (_) {}
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
function writeConfig(directory) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  const temporary = configPath + '.' + randomUUID() + '.tmp'
  try {
    fs.writeFileSync(temporary, JSON.stringify({ dataDirectory: directory }, null, 2), 'utf8')
    fs.renameSync(temporary, configPath)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
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
    const data = migrateData(readJson(result.filePaths[0]))
    const ok = await saveData(data)
    return ok ? { ok: true, data } : { error: hr ? 'KRYPT nije uspio spremiti uvezene podatke.' : 'KRYPT could not save the imported data.' }
  } catch (error) { return { error: (hr ? 'Nije moguće pročitati sigurnosnu kopiju: ' : 'Could not read this backup: ') + error.message } }
}
async function chooseDataDirectory(language) {
  const hr = language === 'hr'
  const result = await dialog.showOpenDialog(mainWindow, { title: hr ? 'Odaberi mapu s podacima KRYPT-a' : 'Choose KRYPT data folder', properties: ['openDirectory', 'createDirectory'] })
  if (result.canceled || !result.filePaths.length) return { canceled: true }
  saveQueue = saveQueue.catch(() => {}).then(() => {
    const copied = []
    try {
      const selectedDirectory = path.resolve(result.filePaths[0])
      fs.mkdirSync(selectedDirectory, { recursive: true })
      const canonical = directory => {
        const resolved = fs.realpathSync(directory)
        return process.platform === 'win32' ? resolved.toLowerCase() : resolved
      }
      if (canonical(selectedDirectory) === canonical(dataDirectory)) return { ok: true, path: dataDirectory }
      const destination = path.join(selectedDirectory, 'krypt-data.json')
      const snapshotDestination = path.join(selectedDirectory, 'backups')
      const occupied = ['', '.backup', '.backup.json', '.tmp'].some(suffix => fs.existsSync(destination + suffix)) ||
        (fs.existsSync(snapshotDestination) && fs.readdirSync(snapshotDestination).length > 0)
      if (occupied) return { error: hr ? 'Ta mapa već sadrži podatke KRYPT-a. Odaberite praznu mapu kako ne biste zamijenili drugi radni prostor.' : 'That folder already contains KRYPT data. Choose an empty folder to avoid replacing another workspace.' }
      const loaded = loadData()
      if (!loaded.data) throw new Error('There is no readable workspace to copy.')
      const sourcePaths = dataPaths()
      const copy = (source, target) => {
        const temporary = target + '.' + randomUUID() + '.tmp'
        try {
          fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL)
          fs.renameSync(temporary, target)
          copied.push(target)
        } finally {
          if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
        }
      }
      // Preserve the current readable workspace even if the primary needed recovery.
      const temporary = destination + '.' + randomUUID() + '.tmp'
      try {
        fs.writeFileSync(temporary, JSON.stringify(loaded.data, null, 2), { encoding: 'utf8', flag: 'wx' })
        fs.renameSync(temporary, destination)
        copied.push(destination)
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
      }
      for (const backup of [sourcePaths.backup, sourcePaths.legacyBackup]) {
        if (!fs.existsSync(backup)) continue
        try { migrateData(readJson(backup)) } catch (_) { continue }
        copy(backup, destination + '.backup')
        break
      }
      if (fs.existsSync(sourcePaths.snapshots)) {
        fs.mkdirSync(snapshotDestination, { recursive: true })
        for (const name of fs.readdirSync(sourcePaths.snapshots).filter(name => name.endsWith('.json'))) {
          copy(path.join(sourcePaths.snapshots, name), path.join(snapshotDestination, name))
        }
      }
      writeConfig(selectedDirectory)
      dataDirectory = selectedDirectory
      return { ok: true, path: dataDirectory }
    } catch (error) {
      for (const file of copied.reverse()) {
        try { fs.unlinkSync(file) } catch (_) {}
      }
      return { error: error.message }
    }
  })
  return saveQueue
}

function requestCloseSave() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => { void showCloseFailure(true) }, 10000)
  try { mainWindow.webContents.send('krypt:flush-request') }
  catch (_) { void showCloseFailure(true) }
}

async function showCloseFailure(unresponsive = false) {
  clearTimeout(closeTimer)
  const win = mainWindow
  if (!win || !closeRequested || closeDialogOpen) return
  closeDialogOpen = true
  try {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning', title: 'Changes could not be saved',
      message: unresponsive ? 'KRYPT is not responding to the save request.' : 'KRYPT could not save your latest changes.',
      detail: 'Retry or keep the app open to protect unsaved changes. Closing without saving may lose your latest edits.',
      buttons: ['Retry save', 'Keep app open', 'Close without saving'], cancelId: 1, defaultId: 0
    })
    if (mainWindow !== win) return
    if (response === 0) requestCloseSave()
    else if (response === 2) { closeAllowed = true; win.destroy() }
    else closeRequested = false
  } finally { closeDialogOpen = false }
}
async function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 720,
    minWidth: 600, minHeight: 520,
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
  win.on('close', event => {
    if (closeAllowed) return
    if (win.webContents.isLoading()) return
    event.preventDefault()
    if (closeRequested) return
    closeRequested = true
    requestCloseSave()
  })
  win.on('closed', () => { clearTimeout(closeTimer); mainWindow = null; closeRequested = false; closeAllowed = false })
  win.webContents.on('render-process-gone', () => { if (closeRequested) void showCloseFailure(true) })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', event => event.preventDefault())
  Menu.setApplicationMenu(null)
  await win.loadFile(path.join(__dirname, 'src', 'index.html'))
  win.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase()
    const command = input.control || input.meta
    if (key === 'f12' || (command && input.shift && ['i', 'j', 'c'].includes(key))) {
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
ipcMain.on('krypt:flush-complete', async (event, ok) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || !closeRequested) return
  clearTimeout(closeTimer)
  if (ok) {
    closeAllowed = true
    mainWindow.close()
    return
  }
  await showCloseFailure()
})

if (ownsInstance) app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
