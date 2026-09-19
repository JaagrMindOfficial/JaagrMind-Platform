import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"

import { RoleSwitcherPill } from "@/components/role-switcher-pill"

export default function CounselorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["counselor", "school_admin"]}>
      <TooltipProvider>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden w-full">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="h-12 border-b flex items-center justify-between px-4 sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <RoleSwitcherPill />
                  <ThemeToggle />
                </div>
              </div>
              <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </ProtectedRoute>
  )
}
