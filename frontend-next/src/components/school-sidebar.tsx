"use client"

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BarChart3,
  LifeBuoy,
  BookOpen,
  Settings,
  Sun,
  Moon,
  LogOut,
  HeartHandshake,
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

const items = [
  {
    title: "Dashboard",
    url: "/school",
    icon: LayoutDashboard,
  },
  {
    title: "Students",
    url: "/school/students",
    icon: Users,
  },
  {
    title: "Counselor Desk",
    url: "/school/counselors",
    icon: HeartHandshake,
  },
  {
    title: "Teacher Access",
    url: "/school/teachers",
    icon: GraduationCap,
  },
  {
    title: "Active Check-ins",
    url: "/school/tests",
    icon: FileText,
  },
  {
    title: "Analytics",
    url: "/school/analytics",
    icon: BarChart3,
  },
  {
    title: "Support",
    url: "/school/support",
    icon: LifeBuoy,
  },
  {
    title: "Platform Guide",
    url: "/school/guide",
    icon: BookOpen,
  },
  {
    title: "Account Settings",
    url: "/school/account",
    icon: Settings,
  },
]

export function SchoolSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { open } = useSidebar()
  const { user, hasRole } = useAuth()

  const isSchoolAdmin = hasRole("school_admin")
  const isTeacherOnly = hasRole("teacher") && !isSchoolAdmin

  const displayedItems = isTeacherOnly
    ? [
        {
          title: "My Classroom",
          url: "/school",
          icon: LayoutDashboard,
        },
        {
          title: "My Students",
          url: "/school/students",
          icon: Users,
        },
        {
          title: "Active Check-ins",
          url: "/school/tests",
          icon: FileText,
        },
        {
          title: "Class Analytics",
          url: "/school/analytics",
          icon: BarChart3,
        },
        {
          title: "Platform Guide",
          url: "/school/guide",
          icon: BookOpen,
        },
      ]
    : items

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 border-b">
        {open ? (
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
            {isTeacherOnly ? "Classroom Portal" : "School Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {displayedItems.map((item) => (
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
