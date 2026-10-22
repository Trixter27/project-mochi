// Keep viewport, focus, anchors, and live preference changes on one one-shot latch.
export function createRevealPlayback() {
  let revealed = false
  return {
    enter(start: () => void) {
      if (revealed) return
      revealed = true
      start()
    },
    show(finish: () => void) {
      revealed = true
      finish()
    },
    leave(finish: () => void) {
      if (revealed) finish()
    },
  }
}

export function isSectionAnchor(hash: string, sectionId: string | undefined) {
  return !!sectionId && hash === `#${sectionId}`
}

export function shouldFinishAnchor(hash: string, sectionId: string | undefined, arrival: 'immediate' | 'viewport', reduced: boolean) {
  return isSectionAnchor(hash, sectionId) && (reduced || arrival === 'immediate')
}
