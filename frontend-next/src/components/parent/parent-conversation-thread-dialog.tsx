"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { MeetingCard } from "./meeting-card";
import { Send, User, ShieldAlert, HeartHandshake, Loader2 } from "lucide-react";

export interface ParentInquiryItem {
  id: string;
  student_name: string;
  counselor_name?: string;
  counselor_type?: string;
  target_recipient?: string;
  subject: string;
  note: string;
  status: string;
  meeting_date?: string;
  meeting_time?: string;
  meeting_link?: string;
  created_at: string;
}

export interface InquiryMessageItem {
  id: string;
  inquiry_id: string;
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface ParentConversationThreadDialogProps {
  inquiry: ParentInquiryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onInquiryUpdated?: () => void;
}

export function ParentConversationThreadDialog({
  inquiry,
  isOpen,
  onClose,
  onInquiryUpdated,
}: ParentConversationThreadDialogProps) {
  const [messages, setMessages] = useState<InquiryMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inquiry?.id) {
      loadMessages();
    }
  }, [isOpen, inquiry?.id]);

  const loadMessages = async () => {
    if (!inquiry?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/api/parent/inquiries/${inquiry.id}/messages`);
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Failed to load inquiry messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!inquiry?.id || !replyText.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/parent/inquiries/${inquiry.id}/reply`, {
        message: replyText.trim(),
      });
      setReplyText("");
      await loadMessages();
      if (onInquiryUpdated) onInquiryUpdated();
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setSending(false);
    }
  };

  if (!inquiry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {inquiry.subject || "Counselor Consultation Thread"}
                </DialogTitle>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    inquiry.status === "resolved"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : inquiry.status === "in_progress"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  }`}
                >
                  {inquiry.status === "resolved"
                    ? "Resolved"
                    : inquiry.status === "in_progress"
                    ? "In Progress"
                    : "Open"}
                </span>
              </div>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Child: <span className="font-medium text-zinc-700 dark:text-zinc-300">{inquiry.student_name}</span> &bull; Assigned:{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {inquiry.counselor_name || "JaagrMind Wellness Desk"}
                </span>
              </DialogDescription>
            </div>
          </div>

          {(inquiry.meeting_link || inquiry.meeting_date || inquiry.meeting_time) && (
            <div className="mt-3">
              <MeetingCard
                meetingDate={inquiry.meeting_date}
                meetingTime={inquiry.meeting_time}
                meetingLink={inquiry.meeting_link}
                compact={false}
              />
            </div>
          )}
        </DialogHeader>

        {/* Chronological Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50/20 dark:bg-zinc-900/20">
          {loading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              Loading conversation history...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm gap-2">
              <HeartHandshake className="w-8 h-8 opacity-40" />
              <p>No messages in this inquiry thread yet.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isParent = m.sender_role === "parent";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isParent ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {m.sender_name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      ({isParent ? "Parent" : "Counselor"})
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-1">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isParent
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-sm"
                        : "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/70 rounded-tl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input Bar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Type your message to the counselor..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              rows={2}
              className="resize-none text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
            />
            <Button
              onClick={handleSendReply}
              disabled={sending || !replyText.trim()}
              className="h-14 px-4 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs flex items-center gap-1.5 shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Press Enter to send, Shift + Enter for new line</span>
            <span>Direct 2-way care advisory communication</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
