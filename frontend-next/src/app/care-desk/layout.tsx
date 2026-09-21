import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"

export default function CareDeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["counselor", "superadmin"]}>
      <TooltipProvider>
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden w-full">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="h-12 border-b flex items-center justify-between px-4 sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground border-l pl-3 border-border/60">
                    <span className="font-semibold text-foreground">JaagrMind Care Desk</span>
                    <span>&bull;</span>
                    <span>Central Care Operations</span>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </ProtectedRoute>
  )
}
