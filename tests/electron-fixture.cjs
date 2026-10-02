const { app } = require('electron')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

// Exercise the production entry point with disposable data and hidden windows.
const directory = path.resolve(process.env.KRYPT_TEST_DIRECTORY || '')
if (!directory.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(directory).startsWith('krypt-ui-')) {
  throw new Error('Electron tests require an isolated krypt-ui- temporary directory.')
}
fs.mkdirSync(directory, { recursive: true })
app.setPath('userData', directory)
app.on('browser-window-created', (_, win) => {
  win.webContents.setBackgroundThrottling(false)
  win.hide()
  win.on('show', () => win.hide())
})
require('../main')
