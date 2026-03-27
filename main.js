const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// ── DATA FILE PATH ──
const dataPath = path.join(app.getPath('userData'), 'studyapp-data.json')

function loadData() {
  try {
    if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  } catch(e) {}
  return null
}

function saveData(data) {
  try { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8') } catch(e) {}
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
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
ipcMain.handle('save-data', (_, data) => { saveData(data); return true })

// Single note export
ipcMain.on('export-notes', async (event, { format, subject, noteName, subjectName, plainText, htmlContent }) => {
  const win = BrowserWindow.getFocusedWindow()
  const ext = format === 'docx' ? 'docx' : format === 'html' ? 'html' : 'txt'
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Export Note',
    defaultPath: subject || 'note',
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  })
  if (canceled || !filePath) return
  try {
    if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx')
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: noteName || subject, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ children: [new TextRun({ text: `${subjectName || ''} · Exported ${new Date().toLocaleDateString()}`, color: '888888', size: 20 })] }),
            new Paragraph(''),
            ...(plainText || '').split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
          ]
        }]
      })
      fs.writeFileSync(filePath, await Packer.toBuffer(doc))
    } else if (format === 'html') {
      const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${noteName || subject}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#111;line-height:1.8;padding:0 20px}h1{font-size:28px}.meta{color:#888;font-size:13px;margin-bottom:32px}</style>
</head><body><h1>${noteName || subject}</h1><div class="meta">${subjectName || ''} · Exported ${new Date().toLocaleDateString()}</div>${htmlContent || ''}</body></html>`
      fs.writeFileSync(filePath, full, 'utf8')
    } else {
      fs.writeFileSync(filePath, plainText || '', 'utf8')
    }
    event.reply('export-done', { success: true })
  } catch(err) {
    console.error('export-notes error:', err)
    event.reply('export-done', { success: false })
  }
})

// Multi-note export — one save dialog per file
ipcMain.on('export-folder', async (event, { format, subject, files }) => {
  const win = BrowserWindow.getFocusedWindow()
  const ext = format === 'docx' ? 'docx' : format === 'html' ? 'html' : 'txt'
  try {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-z0-9 _\-]/gi, '_')
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        title: `Save — ${file.name}`,
        defaultPath: safeName,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
      })
      if (canceled || !filePath) continue
      if (format === 'docx') {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx')
        const doc = new Document({
          sections: [{
            children: [
              new Paragraph({ text: file.name, heading: HeadingLevel.HEADING_1 }),
              new Paragraph({ children: [new TextRun({ text: subject, color: '888888', size: 20 })] }),
              new Paragraph(''),
              ...(file.plainText || '').split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
            ]
          }]
        })
        fs.writeFileSync(filePath, await Packer.toBuffer(doc))
      } else if (format === 'html') {
        const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${file.name}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#111;line-height:1.8;padding:0 20px}h1{font-size:28px}.meta{color:#888;font-size:13px;margin-bottom:32px}</style>
</head><body><h1>${file.name}</h1><div class="meta">${subject}</div>${file.htmlContent}</body></html>`
        fs.writeFileSync(filePath, content, 'utf8')
      } else {
        fs.writeFileSync(filePath, file.plainText || '', 'utf8')
      }
    }
    event.reply('export-done', { success: true })
  } catch(err) {
    console.error('export-folder error:', err)
    event.reply('export-done', { success: false })
  }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
