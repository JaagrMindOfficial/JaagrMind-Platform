export interface MeetingInfo {
  type: "google_meet" | "whatsapp" | "zoom" | "teams" | "generic";
  label: string;
  buttonText: string;
  badgeClass: string;
  url: string;
  isValid: boolean;
}

export function parseMeetingLink(link?: string): MeetingInfo | null {
  if (!link || typeof link !== "string") return null;
  const trimmed = link.trim();
  if (!trimmed) return null;

  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const lower = url.toLowerCase();

  if (lower.includes("meet.google.com")) {
    return {
      type: "google_meet",
      label: "Google Meet",
      buttonText: "Join Google Meet",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      url,
      isValid: true,
    };
  }

  if (lower.includes("wa.me") || lower.includes("whatsapp.com")) {
    return {
      type: "whatsapp",
      label: "WhatsApp Meet",
      buttonText: "Open WhatsApp Call",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      url,
      isValid: true,
    };
  }

  if (lower.includes("zoom.us")) {
    return {
      type: "zoom",
      label: "Zoom Meeting",
      buttonText: "Join Zoom Meeting",
      badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      url,
      isValid: true,
    };
  }

  if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com")) {
    return {
      type: "teams",
      label: "Microsoft Teams",
      buttonText: "Join Teams Meeting",
      badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      url,
      isValid: true,
    };
  }

  return {
    type: "generic",
    label: "Online Meeting",
    buttonText: "Open Consultation Link",
    badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700",
    url,
    isValid: true,
  };
}
