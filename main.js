const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null

// ── DATA FILE PATH ──
// Per-user file on disk (never bundled in the app). Windows example:
// %APPDATA%\krypt\krypt-data.json  (folder name follows package.json "name")
const dataPath = path.join(app.getPath('userData'), 'krypt-data.json')
const backupPath = dataPath + '.backup.json'

function loadData() {
  try {
    if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  } catch(e) {
    console.error('loadData error, attempting backup:', e)
    try {
      if (fs.existsSync(backupPath)) return JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    } catch(e2) {
      console.error('backup load also failed:', e2)
    }
  }
  return null
}

// Atomic write: write to a temp file, back up the previous good copy, then
// rename the temp file over the real one. Rename is atomic on virtually all
// filesystems, so a crash mid-save can't leave krypt-data.json half-written.
function saveData(data) {
  const tmpPath = dataPath + '.tmp'
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
    if (fs.existsSync(dataPath)) {
      try { fs.copyFileSync(dataPath, backupPath) } catch(e) { console.error('backup copy failed:', e) }
    }
    fs.renameSync(tmpPath, dataPath)
    return true
  } catch(e) {
    console.error('saveData error:', e)
    return false
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico')
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainWindow = win
  win.on('closed', () => { mainWindow = null })

  Menu.setApplicationMenu(null)
  win.loadFile('src/index.html')

  // Ctrl+Shift+I to toggle DevTools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools()
    }
  })
}

// ── IPC HANDLERS ──
ipcMain.handle('load-data', () => loadData())
ipcMain.handle('save-data', (_, data) => saveData(data))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})