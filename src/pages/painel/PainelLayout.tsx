import { Outlet } from "react-router-dom"
import { StaffSessionProvider } from "@/lib/auth/StaffSessionContext"

export function PainelLayout() {
  return (
    <StaffSessionProvider>
      <Outlet />
    </StaffSessionProvider>
  )
}
