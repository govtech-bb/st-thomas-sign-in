import { listTodayEntries } from "@/lib/queue";
import { toDisplayEntry } from "@/lib/queue-client";
import { QueueDisplay } from "@/components/QueueDisplay";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const entries = await listTodayEntries();
  // Strip PHI (ID numbers, tokens, staff notes) before it reaches the
  // browser, including the initial RSC payload.
  return <QueueDisplay initialEntries={entries.map(toDisplayEntry)} />;
}
