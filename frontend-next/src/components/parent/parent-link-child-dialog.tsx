"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Link2, Loader2, CheckCircle2 } from "lucide-react";

interface LinkChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (child: any) => void;
}

export function ParentLinkChildDialog({
  open,
  onOpenChange,
  onSuccess,
}: LinkChildDialogProps) {
  const [schoolCode, setSchoolCode] = useState("");
  const [accessId, setAccessId] = useState("");
  const [relationship, setRelationship] = useState("parent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim() || !accessId.trim()) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/parent/link-child`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          school_code: schoolCode.trim().toUpperCase(),
          access_id: accessId.trim(),
          relationship: relationship,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to link student.");
      }

      onSuccess(data.child);
      onOpenChange(false);
      setSchoolCode("");
      setAccessId("");
    } catch (err: any) {
      setError(err.message || "Failed to link student.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md clay-card p-6 border-border">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
              LINK CHILD PROFILE
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10">
              Verified Link
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Link School Student ID
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Connect your child&apos;s school assessment profile to your guardian dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              School Code <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. OAKWOOD"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              required
              className="text-xs font-mono uppercase"
            />
            <p className="text-[10px] text-muted-foreground">
              Provided by your school (e.g. OAKWOOD, MAPLE, RIVERSIDE).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Student Access ID <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. 101"
              value={accessId}
              onChange={(e) => setAccessId(e.target.value)}
              required
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Your child&apos;s unique check-in ID from their teacher or school portal.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Your Relationship</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="parent">Parent</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Guardian / Relative</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="text-xs h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Linking...</span>
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Link Child Profile</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
