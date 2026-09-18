"use client";

import { Video, ExternalLink, Calendar, Clock, MessageSquare } from "lucide-react";
import { parseMeetingLink } from "@/lib/meeting-utils";

interface MeetingCardProps {
  meetingDate?: string;
  meetingTime?: string;
  meetingLink?: string;
  compact?: boolean;
}

export function MeetingCard({
  meetingDate,
  meetingTime,
  meetingLink,
  compact = false,
}: MeetingCardProps) {
  const meetingInfo = parseMeetingLink(meetingLink);

  if (!meetingInfo && !meetingDate && !meetingTime) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-zinc-50/50 dark:bg-zinc-900/50 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          {meetingInfo && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meetingInfo.badgeClass}`}>
              <Video className="w-3.5 h-3.5" />
              {meetingInfo.label}
            </span>
          )}
          {meetingDate && (
            <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              {meetingDate}
            </span>
          )}
          {meetingTime && (
            <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              {meetingTime}
            </span>
          )}
        </div>
        {meetingInfo && (
          <a
            href={meetingInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            {meetingInfo.buttonText}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Scheduled Consultation
            </div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {meetingInfo ? meetingInfo.label : "Virtual Session"}
            </div>
          </div>
        </div>

        {meetingInfo && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meetingInfo.badgeClass}`}>
            {meetingInfo.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>{meetingDate || "Date Pending"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{meetingTime || "Time Pending"}</span>
        </div>
      </div>

      {meetingInfo && (
        <div className="pt-2">
          <a
            href={meetingInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
          >
            {meetingInfo.buttonText}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
