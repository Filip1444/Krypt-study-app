const { test, expect, _electron: electron } = require('@playwright/test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { migrateData } = require('../../data-schema')

let application, page, directory, errors
async function launch() {
  errors = []
  const env = { ...process.env, KRYPT_TEST_DIRECTORY: directory }
  delete env.ELECTRON_RUN_AS_NODE
  application = await electron.launch({
    args: [path.resolve(__dirname, '../electron-fixture.cjs')],
    env
  })
  page = await application.firstWindow()
  page.on('pageerror', error => errors.push(error.message))
  await page.waitForFunction(() => typeof rendererReady !== 'undefined' && rendererReady, null, { polling: 100 })
}
test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'krypt-ui-'))
  await launch()
})
test.afterEach(async () => {
  try {
    if (application) await application.close()
  } finally {
    const resolved = path.resolve(directory)
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('krypt-ui-')) throw new Error('Unsafe test cleanup path')
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  expect(errors).toEqual([])
})
async function notes() {
  await page.locator('[data-page="notes"]').click()
  await page.locator('#newFileBtn').click()
  return page.locator('#notesArea')
}
async function save() {
  expect(await page.evaluate(() => flushPendingSave())).toBe(true)
}

test('inherited subject names, underline shortcut and notes survive an app restart', async () => {
  await page.locator('#addSubjectBtn').click()
  await page.locator('#newSubjectInput').fill('toString')
  await page.locator('#confirmSubject').click()
  const editor = await notes()
  await editor.fill('Persist this note')
  await editor.press('ControlOrMeta+a')
  await editor.press('ControlOrMeta+u')
  await expect(editor.locator('u')).toHaveText('Persist this note')
  await save()
  await application.close()
  await launch()
  await page.locator('.subject-btn', { hasText: 'toString' }).click()
  await page.locator('[data-page="notes"]').click()
  await page.locator('.file-item').first().click()
  await expect(page.locator('#notesArea u')).toHaveText('Persist this note')
})

test('selected image wrappers survive resize, save, and reopening', async () => {
  const editor = await notes()
  await editor.fill('Picture: ')
  await editor.press('End')
  await page.locator('#imageInput').setInputFiles({
    name: 'pixel.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=', 'base64')
  })
  await editor.locator('img').click()
  await expect(editor.locator('.img-wrap')).toHaveClass(/img-selected/)
  const handle = await editor.locator('.img-resize-handle').boundingBox()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + 50, handle.y)
  await page.mouse.up()
  await save()
  const stored = JSON.parse(fs.readFileSync(path.join(directory, 'krypt-data.json'), 'utf8')).notes.Mathematics[0].content
  expect(stored).toContain('class="img-wrap"')
  expect(stored).not.toContain('img-selected')
  expect(stored).not.toContain('img-resize-handle')
  await page.locator('#backToFilesBtn').click()
  await page.locator('.file-item').first().click()
  await editor.locator('img').click()
  await expect(editor.locator('.img-resize-handle')).toHaveCount(1)
})

test('selection creates a flashcard and modal keyboard focus stays contained', async () => {
  const editor = await notes()
  await editor.fill('Selected question')
  await editor.press('ControlOrMeta+a')
  await expect(page.locator('#notesSelectionBadge')).toBeVisible()
  await page.locator('#notesSelectionBadge').click()
  await expect(page.locator('#quickFcFrontInput')).toHaveValue('Selected question')
  await expect(page.locator('#quickFcBackInput')).toBeFocused()
  await page.locator('#quickFcSaveBtn').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#quickFcFrontInput')).toBeFocused()
  await page.locator('#quickFcBackInput').fill('Answer')
  await page.locator('#quickFcBackInput').press('Enter')
  await expect(page.locator('#quickFlashcardModal')).toBeHidden()
  await page.locator('[data-page="flashcards"]').click()
  await expect(page.locator('.fc-front')).toContainText('Selected question')
  await expect(page.locator('.fc-back')).toHaveText('Answer')
  await page.locator('#settingsGearBtn').click()
  await expect(page.locator('#settingsPanel')).toHaveAttribute('role', 'dialog')
  await page.keyboard.press('Escape')
  await expect(page.locator('#settingsGearBtn')).toBeFocused()
})

test('paste removes active content while keeping rich text and font changes', async () => {
  const editor = await notes()
  await editor.evaluate(element => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/html', '<p><b>Safe text</b><script>window.injected=true</script><img src="https://example.invalid/pixel" onerror="window.injected=true"></p>')
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
  })
  await expect(editor.locator('b')).toHaveText('Safe text')
  await expect(editor.locator('script, img')).toHaveCount(0)
  await editor.press('ControlOrMeta+a')
  await page.locator('#fontSize').selectOption('22px')
  await save()
  await page.locator('#backToFilesBtn').click()
  await page.locator('.file-item').first().click()
  await expect(editor.locator('span').first()).toHaveCSS('font-size', '22px')
  expect(await page.evaluate(() => window.injected)).toBeUndefined()
})

test('import rejects HTML in review counters without replacing the current workspace', async () => {
  await (await notes()).fill('Original workspace')
  await save()
  const malicious = migrateData({ subjects: ['Imported'] })
  malicious.reviewLog['2026-10-01'] = { total: 1, correct: '\"><div>Injected</div>' }
  const file = path.join(directory, 'invalid-import.json')
  fs.writeFileSync(file, JSON.stringify(malicious))
  await application.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
  }, file)
  const result = await page.evaluate(() => window.krypt.importData('en'))
  expect(result.error).toContain('invalid structure')
  expect(JSON.parse(fs.readFileSync(path.join(directory, 'krypt-data.json'), 'utf8')).notes.Mathematics[0].content).toContain('Original workspace')
})

test('timer accounts for elapsed time and restarting zero begins a full new session', async () => {
  await page.clock.install({ time: new Date('2026-10-01T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-01T12:00:01Z'))
  await page.locator('[data-page="timer"]').click()
  await page.locator('#startBtn').click()
  await page.clock.fastForward(25 * 60 * 1000)
  await expect(page.locator('#timerDisplay')).toHaveText('00:00')
  await expect(page.locator('#sessionCount')).toHaveText('1')
  await page.locator('#startBtn').click()
  await page.clock.fastForward(1000)
  await expect(page.locator('#timerDisplay')).toHaveText('24:59')
  await expect(page.locator('#sessionCount')).toHaveText('1')
  await page.locator('#pauseBtn').click()
  await page.clock.fastForward(60000)
  await expect(page.locator('#timerDisplay')).toHaveText('24:59')
})

test('close flushes a pending note edit through the real IPC bridge', async () => {
  await (await notes()).fill('Saved during close')
  await application.close()
  application = null
  expect(JSON.parse(fs.readFileSync(path.join(directory, 'krypt-data.json'), 'utf8')).notes.Mathematics[0].content).toContain('Saved during close')
})

test('a second real Electron process exits without opening a competing workspace', async () => {
  await (await notes()).fill('Keep this active workspace')
  const env = { ...process.env, KRYPT_TEST_DIRECTORY: directory }
  delete env.ELECTRON_RUN_AS_NODE
  const second = spawn(require('electron'), [path.resolve(__dirname, '../electron-fixture.cjs')], { env, windowsHide: true, stdio: 'ignore' })
  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { second.kill(); reject(new Error('Second process did not exit')) }, 10000)
    second.on('error', error => { clearTimeout(timeout); reject(error) })
    second.on('exit', code => { clearTimeout(timeout); resolve(code) })
  })
  expect(code).toBe(0)
  await expect(page.locator('#notesArea')).toHaveText('Keep this active workspace')
  await save()
})

test('recovery dialog traps focus until a valid backup is restored', async () => {
  await application.close()
  fs.writeFileSync(path.join(directory, 'krypt-data.json'), '{broken')
  const backup = path.join(directory, 'restore.json')
  fs.writeFileSync(backup, JSON.stringify(migrateData({ subjects: ['Recovered'] })))
  await launch()
  await expect(page.locator('#recoveryOverlay')).toBeVisible()
  await page.locator('#recoveryStartFreshBtn').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#recoveryImportBtn')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#recoveryOverlay')).toBeVisible()
  await application.evaluate(({ dialog }, backupPath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backupPath] })
  }, backup)
  await page.locator('#recoveryImportBtn').click()
  await expect(page.locator('#recoveryOverlay')).toBeHidden()
  await expect(page.locator('.subject-btn')).toHaveText('Recovered')
  await save()
  expect(fs.readdirSync(path.join(directory, 'backups')).some(name => name.startsWith('unreadable-main-'))).toBe(true)
})
