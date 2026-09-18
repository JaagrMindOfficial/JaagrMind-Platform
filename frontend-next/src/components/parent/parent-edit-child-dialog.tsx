"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  AlertTriangle,
  School,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface ChildSummary {
  id: string;
  name: string;
  nickname?: string;
  grade: string;
  section: string;
  access_id: string;
  school_id?: string;
  school_name: string;
  school_code: string;
  is_linked: boolean;
}

interface ParentEditChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: ChildSummary | null;
  onChildUpdated: (updated: any) => void;
}

export function ParentEditChildDialog({
  open,
  onOpenChange,
  child,
  onChildUpdated,
}: ParentEditChildDialogProps) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("10th");
  const [schoolCode, setSchoolCode] = useState("");
  const [accessID, setAccessID] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (child) {
      setName(child.name || "");
      setNickname(child.nickname || "");
      setGrade(child.grade || "10th");
      setSchoolCode(child.school_code && child.school_code !== "HOME" ? child.school_code : "");
      setAccessID(child.access_id && !child.access_id.startsWith("IND-") && !child.access_id.startsWith("HOME-") ? child.access_id : "");
      setError("");
      setSuccess(false);
    }
  }, [child, open]);

  if (!child) return null;

  const isCurrentlyIndependent = !child.is_linked || child.school_code === "HOME" || !child.school_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Official student name is required.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        student_id: child.id,
        name: name.trim(),
        nickname: nickname.trim(),
        grade,
        school_code: schoolCode.trim().toUpperCase(),
        access_id: accessID.trim(),
      };

      const res = await api.put("/api/parent/child", payload);

      if (res?.child) {
        setSuccess(true);
        setTimeout(() => {
          onChildUpdated(res.child);
          onOpenChange(false);
          setSuccess(false);
        }, 900);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update child profile. Please verify details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!loading) {
          onOpenChange(val);
          if (!val) {
            setError("");
            setSuccess(false);
          }
        }
      }}
    >
      <DialogContent className="clay-card sm:max-w-lg border-border p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Pencil className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Edit Child Profile: {child.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update official identification, familiar home nickname, standard, or institutional affiliation.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">Profile Successfully Updated!</p>
            <p className="text-xs text-muted-foreground">Refreshing your dashboard view...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Identity Warning Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Identity Verification Mandate</span>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground/80">
                Please ensure your child&apos;s official name strictly matches their official school admission records and Government National ID (such as <strong>Aadhaar card</strong>). Certified assessments and counselor notes rely on this legal name.
              </p>
            </div>

            {/* Official Legal Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Official Student Legal Name <span className="text-destructive">*</span></span>
                <span className="text-[10px] text-muted-foreground font-normal">Matches Aadhaar / School Records</span>
              </label>
              <Input
                placeholder="e.g. Aarav Rajesh Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs h-9 font-medium"
              />
            </div>

            {/* Home Nickname / Familiar Name */}
            <div className="space-y-1.5 p-3 rounded-xl neo-well border border-border/70">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                  <span>Home Nickname / Pet Name (Optional)</span>
                </label>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Parent Convenience
                </Badge>
              </div>
              <Input
                placeholder="e.g. Aaru, Guddu, Chintu, Rohan"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="text-xs h-9 bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                For your comfort at home: we&apos;ll warmly use this nickname across your parent overview while keeping official reports under their legal name.
              </p>
            </div>

            {/* Grade / Class */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Enrolled Standard / Class <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="6th" className="bg-popover text-popover-foreground">Class 6 (Middle School)</option>
                <option value="7th" className="bg-popover text-popover-foreground">Class 7 (Middle School)</option>
                <option value="8th" className="bg-popover text-popover-foreground">Class 8 (Middle School)</option>
                <option value="9th" className="bg-popover text-popover-foreground">Class 9 (Secondary)</option>
                <option value="10th" className="bg-popover text-popover-foreground">Class 10 (Secondary)</option>
                <option value="11th" className="bg-popover text-popover-foreground">Class 11 (Senior Secondary)</option>
                <option value="12th" className="bg-popover text-popover-foreground">Class 12 (Senior Secondary)</option>
              </select>
            </div>

            {/* School Affiliation & Linking */}
            <div className="pt-2 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <School className="h-4 w-4 text-sky-500" />
                  <span className="text-xs font-bold text-foreground">School Connection</span>
                </div>
                {isCurrentlyIndependent ? (
                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
                    Independent Study
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    Connected to School
                  </Badge>
                )}
              </div>

              {isCurrentlyIndependent ? (
                <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-3">
                  <p className="text-xs text-foreground/90 font-medium">
                    Link this student to their educational institution:
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    If your child&apos;s school has joined JaagrMind, enter their official School Code and Student Access ID below to connect directly with on-campus counselors and school check-ins.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-muted-foreground">
                        School Code
                      </label>
                      <Input
                        placeholder="e.g. OAKWOOD"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        className="text-xs font-mono uppercase h-8 bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-muted-foreground">
                        Student Access ID
                      </label>
                      <Input
                        placeholder="e.g. 101 or STU-04"
                        value={accessID}
                        onChange={(e) => setAccessID(e.target.value)}
                        className="text-xs font-mono h-8 bg-background"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl neo-well border border-border/70 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{child.school_name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Enrolled under institutional School Code: <strong className="font-mono text-foreground">{child.school_code}</strong> (Student Access ID: <span className="font-mono text-foreground">{child.access_id}</span>).
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="text-xs h-9 bg-sky-600 hover:bg-sky-500 text-white font-semibold"
              >
                {loading ? "Saving..." : "Save Profile Details"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
