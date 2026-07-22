import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl tracking-wide">404</h1>
      <p className="text-sm text-muted-foreground">Página não encontrada.</p>
      <Link to="/" className="text-sm font-semibold text-primary hover:underline">
        Voltar ao início
      </Link>
    </div>
  )
}
