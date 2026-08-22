export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// "Karen W." -- first name + last initial. Used on public display and audio.
export function maskedDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

// Fields the public waiting-room display actually renders or announces.
// Everything else (tokens, ID numbers/types, staff notes, priority reasons)
// must never reach the browser on a public page -- not via the initial
// server render, and not via the /api/display poll.
export interface DisplayEntry {
  id: string;
  name: string;
  visit_type: string;
  position: number;
  ticket_number: number | null;
  status: string;
  priority: boolean;
  created_at: string;
  called_at: string | null;
}

export function toDisplayEntry(e: {
  id: string;
  name: string;
  visit_type: string;
  position: number;
  ticket_number: number | null;
  status: string;
  priority: boolean;
  created_at: string;
  called_at: string | null;
}): DisplayEntry {
  return {
    id: e.id,
    name: e.name,
    visit_type: e.visit_type,
    position: e.position,
    ticket_number: e.ticket_number,
    status: e.status,
    priority: e.priority,
    created_at: e.created_at,
    called_at: e.called_at,
  };
}
