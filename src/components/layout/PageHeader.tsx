import { Link } from "react-router-dom"
import { Logo } from "./Logo"

export function PageHeader({ backTo, backLabel }: { backTo?: string; backLabel?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link to="/">
        <Logo />
      </Link>
      {backTo && (
        <Link
          to={backTo}
          className="text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {backLabel ?? "Início"}
        </Link>
      )}
    </header>
  )
}
