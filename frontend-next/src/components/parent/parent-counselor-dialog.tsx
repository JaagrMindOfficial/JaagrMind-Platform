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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Send, Loader2, CheckCircle2, HeartHandshake, Building2 } from "lucide-react";

interface CounselorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counselorName: string;
  schoolName: string;
  branchName?: string;
  isPlatform?: boolean;
  studentId: string;
  childName: string;
  onSuccess?: () => void;
}

export function ParentCounselorDialog({
  open,
  onOpenChange,
  counselorName,
  schoolName,
  branchName,
  isPlatform = false,
  studentId,
  childName,
  onSuccess,
}: CounselorDialogProps) {
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [isConfidential, setIsConfidential] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/parent/counselor-note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          subject: subject.trim() || (isPlatform ? "JaagrMind Parent Inquiry" : "Parent School Note"),
          note: note.trim(),
          is_confidential: isConfidential,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message.");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSubject("");
        setNote("");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md clay-card p-6 border-border">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase text-sky-600 dark:text-sky-400">
              {isPlatform ? "JAAGRMIND CENTRAL COUNSELING" : "SCHOOL COUNSELOR"}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 gap-1">
              <Lock className="h-2.5 w-2.5" />
              Confidential
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            {isPlatform ? "Message JaagrMind Counselor" : `Message ${counselorName}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isPlatform
              ? "Your query will be routed directly to JaagrMind's platform counseling team for review and response."
              : `Direct communication with the counselor at ${schoolName}${branchName ? ` (${branchName})` : ""}.`}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Message Sent Confidentially</h4>
              <p className="text-xs text-muted-foreground">
                {isPlatform
                  ? "Your inquiry has been submitted to the JaagrMind counseling desk."
                  : `Your message has been delivered to ${counselorName}.`}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Subject / Focus</label>
              <Input
                placeholder="e.g. Exam nervousness, study concentration, teacher feedback"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Message / Question <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Share the details or context you would like the counselor to assist with..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={4}
                className="text-xs resize-none"
              />
            </div>

            <div className="p-3 rounded-xl neo-well text-[11px] text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                {isPlatform
                  ? "This query is confidential and routed to JaagrMind senior specialists. Responses will be sent to your account email."
                  : `This note is confidential between you and ${counselorName}. It will not be shown to ${childName}.`}
              </span>
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
                disabled={loading || !note.trim()}
                size="sm"
                className="text-xs h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Confidential Message</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
