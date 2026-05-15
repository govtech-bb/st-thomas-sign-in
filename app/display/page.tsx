import { listTodayEntries } from "@/lib/queue";
import { QueueDisplay } from "@/components/QueueDisplay";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const entries = await listTodayEntries();
  return <QueueDisplay initialEntries={entries} />;
}
