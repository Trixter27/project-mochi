import { Component, type ErrorInfo, type ReactNode } from 'react'

export function CarFallback({ loading = false }: { loading?: boolean }) {
  return <div className="car-fallback" role="status"><p>{loading ? 'A little car is getting ready…' : 'Our little car is parked for now.'}</p><small>{loading ? 'A little coral-colored daydream.' : 'The 3D preview is unavailable.'}</small></div>
}

export class CarBoundary extends Component<{ children: ReactNode; onFailure?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[Car] Scene error', error, info.componentStack)
    this.props.onFailure?.()
  }
  render() { return this.state.failed ? <CarFallback /> : this.props.children }
}
