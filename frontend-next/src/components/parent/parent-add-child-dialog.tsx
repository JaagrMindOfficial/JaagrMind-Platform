"use client";

import { useState } from "react";
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
import { UserPlus, School, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface ParentAddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChildAdded: (child: any) => void;
}

export function ParentAddChildDialog({
  open,
  onOpenChange,
  onChildAdded,
}: ParentAddChildDialogProps) {
  const [mode, setMode] = useState<"direct" | "school_code">("direct");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Direct form
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("10th");
  const [schoolName, setSchoolName] = useState("");
  const [relationship, setRelationship] = useState("parent");

  // School code form
  const [schoolCode, setSchoolCode] = useState("");
  const [accessID, setAccessID] = useState("");

  const resetForm = () => {
    setName("");
    setGrade("10th");
    setSchoolName("");
    setRelationship("parent");
    setSchoolCode("");
    setAccessID("");
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let payload: any = {
        relationship,
      };

      if (mode === "direct") {
        if (!name.trim()) {
          setError("Please enter your child's name.");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          name: name.trim(),
          grade,
          school_name: schoolName.trim() || "Independent / Home Study",
        };
      } else {
        if (!schoolCode.trim() || !accessID.trim()) {
          setError("Both School Code and Student Access ID are required.");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          school_code: schoolCode.trim().toUpperCase(),
          access_id: accessID.trim(),
          name: name.trim() || "Student",
          grade,
        };
      }

      const res = await api.post("/api/parent/add-child", payload);

      if (res?.child) {
        setSuccess(true);
        setTimeout(() => {
          onChildAdded(res.child);
          onOpenChange(false);
          resetForm();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add child profile. Please check details.");
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
          if (!val) resetForm();
        }
      }}
    >
      <DialogContent className="clay-card sm:max-w-md border-border p-6 shadow-xl">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Add Child Profile
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Connect another child to view their equilibrium, routine, and standard-specific check-ins.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 pt-1 pb-2">
          <button
            type="button"
            onClick={() => {
              setMode("direct");
              setError("");
            }}
            className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === "direct"
                ? "bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Quick Add (Name & Grade)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("school_code");
              setError("");
            }}
            className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === "school_code"
                ? "bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <School className="h-3.5 w-3.5" />
            <span>Link with School Code</span>
          </button>
        </div>

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
            <p className="text-sm font-bold text-foreground">Child Profile Connected!</p>
            <p className="text-xs text-muted-foreground">Updating your dashboard view...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {mode === "direct" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Child&apos;s Full Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Diya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Standard / Class <span className="text-destructive">*</span>
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                    >
                      <option value="6th" className="bg-popover text-popover-foreground">Class 6 (Middle)</option>
                      <option value="7th" className="bg-popover text-popover-foreground">Class 7 (Middle)</option>
                      <option value="8th" className="bg-popover text-popover-foreground">Class 8 (Middle)</option>
                      <option value="9th" className="bg-popover text-popover-foreground">Class 9 (Secondary)</option>
                      <option value="10th" className="bg-popover text-popover-foreground">Class 10 (Secondary)</option>
                      <option value="11th" className="bg-popover text-popover-foreground">Class 11 (Senior Sec)</option>
                      <option value="12th" className="bg-popover text-popover-foreground">Class 12 (Senior Sec)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Relationship
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    >
                      <option value="parent" className="bg-popover text-popover-foreground">Mother / Father</option>
                      <option value="guardian" className="bg-popover text-popover-foreground">Guardian</option>
                      <option value="relative" className="bg-popover text-popover-foreground">Family Relative</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    School Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Oakwood High School"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    School Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. OAKWOOD"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    required
                    className="text-xs font-mono uppercase h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Provided by your child&apos;s educational institution.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Student Access ID <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. 101 or STU-2026-04"
                    value={accessID}
                    onChange={(e) => setAccessID(e.target.value)}
                    required
                    className="text-xs font-mono h-9"
                  />
                </div>
              </>
            )}

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
                {loading ? "Adding..." : "Save & View Dashboard"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
