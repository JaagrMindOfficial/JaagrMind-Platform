"use client"

import {
  LayoutDashboard,
  Building2,
  Users,
  LifeBuoy,
  ShieldCheck,
  BookOpen,
  Settings,
  GraduationCap,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  HeartHandshake,
  FolderOpen,
  FileText,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"

const adminItems = [
  { title: "Overview", url: "/internal-ops/admin", icon: LayoutDashboard },
  { title: "Platform Analytics", url: "/internal-ops/admin/analytics", icon: BarChart3 },
  { title: "Schools", url: "/internal-ops/admin/schools", icon: Building2 },
  { title: "Institution Requests", url: "/internal-ops/admin/institution-applications", icon: BookOpen },
  { title: "Check-ins", url: "/internal-ops/admin/assessments", icon: FileText },
  { title: "Care Desk & Counseling", url: "/internal-ops/admin/counseling", icon: HeartHandshake },
  { title: "Support Tickets", url: "/internal-ops/admin/tickets", icon: LifeBuoy },
  { title: "Platform Guide", url: "/internal-ops/admin/guide", icon: BookOpen },
  { title: "Platform Admins", url: "/internal-ops/admin/admins", icon: ShieldCheck },
  { title: "Account", url: "/internal-ops/admin/account", icon: Settings },
]

const schoolItems = [
  { title: "Dashboard", url: "/school", icon: LayoutDashboard },
  { title: "Students", url: "/school/students", icon: Users },
  { title: "Counselor Desk", url: "/school/counselors", icon: HeartHandshake },
  { title: "Teachers", url: "/school/teachers", icon: GraduationCap },
  { title: "Active Check-ins", url: "/school/tests", icon: FileText },
  { title: "Analytics", url: "/school/analytics", icon: BarChart3 },
  { title: "Support", url: "/school/support", icon: LifeBuoy },
  { title: "Platform Guide", url: "/school/guide", icon: BookOpen },
  { title: "Account Settings", url: "/school/account", icon: Settings },
]

const counselorItems = [
  { title: "Counselor Desk", url: "/counselor", icon: HeartHandshake },
  { title: "Student Dossiers", url: "/counselor/dossiers", icon: FolderOpen },
  { title: "Active Check-ins", url: "/counselor/tests", icon: FileText },
  { title: "Support", url: "/counselor/support", icon: LifeBuoy },
  { title: "Account Settings", url: "/counselor/account", icon: Settings },
]

const careDeskItems = [
  { title: "Care Desk", url: "/internal-ops/care-desk", icon: HeartHandshake },
  { title: "Support", url: "/internal-ops/care-desk/support", icon: LifeBuoy },
  { title: "Account Settings", url: "/internal-ops/admin/account", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isSuperAdmin, isSchoolAdmin, isCounselor, isTeacher } = useAuth()

  const isCareDeskPortal = pathname.startsWith("/internal-ops/care-desk") || pathname.startsWith("/care-desk")
  const isCounselorPortal = pathname.startsWith("/counselor")
  const isSchoolPortal = pathname.startsWith("/school")
  
  // Decide which items to show based on portal route
  let items = adminItems
  let label = "Operations Admin"

  if (isSchoolPortal) {
    items = schoolItems
    label = "School Portal"
  } else if (isCounselorPortal) {
    items = counselorItems
    label = "Counselor Portal"
  } else if (isCareDeskPortal) {
    if (isSuperAdmin) {
      items = adminItems
      label = "Operations Admin"
    } else {
      items = careDeskItems
      label = "JaagrMind Care Desk"
    }
  }
  const { state } = useSidebar()

  const { setTheme, theme, resolvedTheme } = useTheme()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 pb-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:py-3">
        {state === "expanded" ? (
          <div className="flex items-center">
            <img src="/DarkColorLogo.svg" alt="JaagrMind Logo" className="h-9 w-auto dark:hidden" />
            <img src="/LightColorLogo.svg" alt="JaagrMind Logo" className="h-9 w-auto hidden dark:block" />
          </div>
        ) : (
          <div className="flex justify-center items-center w-full py-1">
            <img src="/JM-Dark.svg" alt="JM Logo" className="h-8 w-auto max-w-[34px] object-contain dark:hidden" />
            <img src="/JM-White.svg" alt="JM Logo" className="h-8 w-auto max-w-[34px] object-contain hidden dark:block" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-medium text-muted-foreground/70 mb-2">
            {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url}
                    onClick={() => router.push(item.url)}
                    className="flex items-center gap-3 w-full cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-[13px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-[13px]">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
