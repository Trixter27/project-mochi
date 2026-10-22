import { useSyncExternalStore } from 'react'

// The installed Motion hook snapshots the preference at mount. Share one live
// media-query subscription so new scroll/reveal effects also stop on a live change.
let media: MediaQueryList | undefined
const listeners = new Set<() => void>()
const query = () => {
  if (!media && typeof window !== 'undefined') media = window.matchMedia('(prefers-reduced-motion: reduce)')
  return media
}
const notify = () => { listeners.forEach(listener => listener()) }

export const reducedMotionPreference = {
  subscribe(listener: () => void) {
    const preference = query()
    if (!listeners.size) preference?.addEventListener('change', notify)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (!listeners.size) preference?.removeEventListener('change', notify)
    }
  },
  getSnapshot: () => query()?.matches ?? false,
  getServerSnapshot: () => false,
}

export function useReducedMotionPreference() {
  return useSyncExternalStore(reducedMotionPreference.subscribe, reducedMotionPreference.getSnapshot, reducedMotionPreference.getServerSnapshot)
}
