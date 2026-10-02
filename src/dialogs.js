(() => {
  const selector = 'button, input, select, textarea, a[href], [tabindex]'
  let stack = []
  let background = []

  function active() { return stack.at(-1)?.element || null }
  function focusable(element) {
    return [...element.querySelectorAll(selector)].filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length && !node.closest('[inert]'))
  }
  function focusDialog(element) {
    const target = element.querySelector('[data-dialog-initial]') || focusable(element)[0] || element
    target.focus()
  }
  function restoreBackground() {
    for (const [element, inert] of background) element.inert = inert
    background = []
  }
  function isolate(element) {
    for (let branch = element; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch) continue
        background.push([sibling, sibling.inert])
        sibling.inert = true
      }
    }
  }
  function start(dismiss) {
    const dialogs = Object.entries(dismiss).map(([id, close]) => {
      const element = document.getElementById(id)
      element.setAttribute('role', 'dialog')
      element.setAttribute('aria-modal', 'true')
      element.tabIndex = -1
      const title = element.querySelector('.modal-title, .settings-title')
      if (title) {
        if (!title.id) title.id = id + '-title'
        element.setAttribute('aria-labelledby', title.id)
      }
      return { element, close, opener: null }
    })
    const sync = () => {
      const before = stack.at(-1)
      stack = stack.filter(entry => !entry.element.classList.contains('hidden'))
      for (const entry of dialogs) {
        if (entry.element.classList.contains('hidden') || stack.includes(entry)) continue
        entry.opener = document.activeElement
        stack.push(entry)
      }
      const after = stack.at(-1)
      if (before === after) return
      restoreBackground()
      if (after) {
        isolate(after.element)
        if (!after.element.contains(document.activeElement)) focusDialog(after.element)
      } else if (before?.opener?.isConnected && !before.opener.closest('[inert]')) {
        before.opener.focus()
      }
    }
    new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })
    document.addEventListener('keydown', event => {
      const entry = stack.at(-1)
      if (!entry) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (entry.close) entry.close()
      } else if (event.key === 'Tab') {
        const controls = focusable(entry.element)
        const index = controls.indexOf(document.activeElement)
        if (!controls.length) { event.preventDefault(); entry.element.focus(); return }
        if (index === -1 || (event.shiftKey && index === 0) || (!event.shiftKey && index === controls.length - 1)) {
          event.preventDefault()
          controls[event.shiftKey ? controls.length - 1 : 0].focus()
        }
      }
    }, true)
    document.addEventListener('focusin', event => {
      const dialog = active()
      if (dialog && !dialog.contains(event.target)) focusDialog(dialog)
    })
    sync()
  }
  window.KryptDialogs = { start, active }
})()
