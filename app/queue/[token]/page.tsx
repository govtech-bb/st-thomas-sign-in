import { notFound } from "next/navigation";
import { getQueueViewForToken } from "@/lib/queue";
import { QueuePosition } from "@/components/QueuePosition";

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
}

export default async function PersonalQueuePage({ params }: Props) {
  const view = await getQueueViewForToken(params.token);
  if (!view) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-2 text-2xl font-bold">Hi, {view.entry.name.split(" ")[0]}</h1>
        <p className="mt-1 text-slate-600">
          Keep this page open. It updates automatically as the queue moves.
        </p>
      </header>

      <QueuePosition initialEntry={view.entry} initialAhead={view.ahead} />

      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Reference</dt>
          <dd className="mt-1 font-mono text-lg font-semibold tracking-widest">
            {view.entry.token}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Visit type</dt>
          <dd className="mt-1 font-semibold capitalize">{view.entry.visit_type}</dd>
        </div>
      </dl>

      <p className="mt-12 text-xs text-slate-500">
        Trouble with the queue? Speak to a member of staff at the front desk and show
        them your reference code.
      </p>
    </main>
  );
}
