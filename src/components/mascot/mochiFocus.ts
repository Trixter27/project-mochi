/** Observe input modality without blurring the button or changing native activation. */
export function observeMochiFocus(button: HTMLButtonElement, onChange: (curious: boolean) => void) {
  const doc = button.ownerDocument, win = doc.defaultView
  let modality: 'keyboard' | 'pointer' | 'unknown' = 'unknown'
  let frame = 0
  const cancel = () => { if (frame && win) win.cancelAnimationFrame(frame); frame = 0 }
  const pointer = () => { modality = 'pointer'; cancel(); onChange(false) }
  const keyboard = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
    modality = 'keyboard'
    cancel()
    if (doc.activeElement === button) onChange(true)
  }
  const focus = () => {
    cancel()
    // Capturing Tab/pointerdown establishes modality before focus fires in Chromium.
    // For programmatic focus, wait until focus-visible styling has been resolved.
    if (modality !== 'unknown') { onChange(modality === 'keyboard'); return }
    if (win) frame = win.requestAnimationFrame(() => {
      frame = 0
      onChange(doc.activeElement === button && button.matches(':focus-visible'))
    })
  }
  const blur = () => { cancel(); onChange(false) }
  doc.addEventListener('pointerdown', pointer, { capture: true, passive: true })
  doc.addEventListener('keydown', keyboard, true)
  button.addEventListener('focus', focus)
  button.addEventListener('blur', blur)
  if (doc.activeElement === button) focus()
  return () => {
    cancel()
    doc.removeEventListener('pointerdown', pointer, true)
    doc.removeEventListener('keydown', keyboard, true)
    button.removeEventListener('focus', focus)
    button.removeEventListener('blur', blur)
  }
}
