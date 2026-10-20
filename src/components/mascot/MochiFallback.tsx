import { Component, type ErrorInfo, type ReactNode } from 'react'

export function MochiFallback({ loading = false }: { loading?: boolean }) {
  return <div className="mascot-fallback" role="status">
    <span aria-hidden="true">✦</span>
    <p>{loading ? 'Mochi is getting ready…' : 'Mochi is resting here.'}</p>
    <small>{loading ? 'A tiny hello is on its way.' : 'The 3D scene is unavailable. Your visit still makes him smile.'}</small>
  </div>
}

export class MochiBoundary extends Component<{
  children: ReactNode
  onFailure?: () => void
  label?: string
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[Mochi] React rendering error', error, {
        boundary: this.props.label,
        componentStack: info.componentStack,
      })
    }
    this.props.onFailure?.()
  }

  render() { return this.state.failed ? <MochiFallback /> : this.props.children }
}
