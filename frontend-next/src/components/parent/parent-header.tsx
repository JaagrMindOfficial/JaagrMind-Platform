"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleSwitcherPill } from "@/components/role-switcher-pill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ChevronDown,
  Plus,
  LogOut,
  HeartHandshake,
  School,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChildSummary {
  id: string;
  name: string;
  nickname?: string;
  grade: string;
  section: string;
  access_id: string;
  school_name: string;
  school_code?: string;
  is_linked: boolean;
}

interface ParentHeaderProps {
  parentName: string;
  activeChild: ChildSummary;
  allChildren: ChildSummary[];
  onSelectChild: (childId: string) => void;
  onOpenAddChildModal: () => void;
  onOpenCounselorModal: () => void;
}

export function ParentHeader({
  parentName,
  activeChild,
  allChildren,
  onSelectChild,
  onOpenAddChildModal,
  onOpenCounselorModal,
}: ParentHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & Child Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/DarkColorLogo.svg"
              alt="JaagrMind"
              className="h-7 w-auto dark:hidden object-contain"
            />
            <img
              src="/LightColorLogo.svg"
              alt="JaagrMind"
              className="h-7 w-auto hidden dark:block object-contain"
            />
          </div>

          {/* Child Switcher Pill */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted/80 border border-border/70 transition-all text-left shadow-2xs">
                <div className="h-5 w-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold font-mono">
                  {activeChild?.name ? activeChild.name.charAt(0) : "+"}
                </div>
                <div className="flex flex-col max-w-[120px] sm:max-w-[160px]">
                  <span className="text-xs font-semibold text-foreground truncate leading-tight">
                    {activeChild?.name || "Add Child"}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono truncate leading-tight">
                    {activeChild?.grade
                      ? activeChild.school_name
                        ? `Class ${activeChild.grade} • ${activeChild.school_name}`
                        : `Class ${activeChild.grade}`
                      : "No Student Linked"}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-xl border border-border bg-card p-1.5 shadow-md">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-semibold">
                    Your Children ({allChildren.length})
                  </span>
                </div>
                {allChildren.map((child) => (
                  <DropdownMenuItem
                    key={child.id}
                    onClick={() => onSelectChild(child.id)}
                    className={`flex items-center justify-between text-xs py-2 px-2.5 rounded-lg cursor-pointer ${
                      child.id === activeChild?.id ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{child.name}</span>
                      <span className="text-[10px] text-muted-foreground">{child.school_name || "Home Study"}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {child.grade}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onOpenAddChildModal}
                  className="text-xs text-sky-600 dark:text-sky-400 font-semibold gap-1.5 py-2 px-2.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Child</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {allChildren.length > 1 && (
              <Badge variant="secondary" className="hidden md:inline-flex text-[10px] font-medium py-0.5 px-2 bg-muted/60">
                {allChildren.length} Children
              </Badge>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <RoleSwitcherPill />

          {/* Quick Counselor Connect button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCounselorModal}
            className="hidden sm:flex text-xs h-8 gap-1.5 rounded-full border-border/80 bg-muted/40 hover:bg-muted/70 font-medium px-3 cursor-pointer"
          >
            <HeartHandshake className="h-3.5 w-3.5 text-sky-500" />
            <span>Counselor Support</span>
          </Button>

          <ThemeToggle />

          {/* User Profile / Logout */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
              {parentName ? parentName.charAt(0).toUpperCase() : "P"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border border-border bg-card p-1.5 shadow-md">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-foreground line-clamp-1">{parentName}</p>
                <p className="text-[10px] font-mono text-muted-foreground">Parent Portal</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onOpenAddChildModal}
                className="text-xs gap-2 py-2 cursor-pointer sm:hidden"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Child Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenCounselorModal}
                className="text-xs gap-2 py-2 cursor-pointer md:hidden"
              >
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>Message Counselor</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-xs text-destructive gap-2 py-2 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
