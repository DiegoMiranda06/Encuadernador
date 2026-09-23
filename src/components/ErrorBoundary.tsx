import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Último recurso ante un error de render no controlado — nunca reemplaza el manejo de errores
 * de cada pantalla, solo evita que un fallo deje una pantalla en blanco sin explicación.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <h1 className="text-[18px] font-semibold text-text">Algo salió mal</h1>
        <p className="max-w-[420px] text-[13px] text-text-muted">{this.state.error.message}</p>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    )
  }
}
