import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getQueueViewForToken } from "@/lib/queue";
import { QueuePosition } from "@/components/QueuePosition";

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function idTypeLabel(value: string): string {
  return value === "passport" ? "Passport" : "National ID";
}

function maskId(value: string): string {
  const v = String(value ?? "").trim();
  if (v.length <= 3) return v;
  return `…${v.slice(-3)}`;
}

export default async function PersonalQueuePage({ params }: Props) {
  const view = await getQueueViewForToken(params.token);
  if (!view) notFound();

  const baseUrl = resolveBaseUrl();
  const lookupUrl = `${baseUrl}/lookup`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-2 text-2xl font-bold">Hi, {view.entry.name.split(" ")[0]}</h1>
        <p className="mt-1 text-slate-600">
          You can return to this page at any time to check your position.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Checked in as: <span className="font-medium text-slate-700">{view.entry.name}</span>{" "}
          ·{" "}
          {idTypeLabel(view.entry.id_type ?? "national_id")}: ending{" "}
          <span className="font-mono">{maskId(view.entry.id_number ?? "")}</span>
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

      <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-bold text-slate-800">How to find your place again</h2>
        <p className="mt-1 text-sm text-slate-600">
          Go to{" "}
          <a href={lookupUrl} className="font-semibold text-brand hover:underline">
            {lookupUrl.replace(/^https?:\/\//, "")}
          </a>{" "}
          and enter your name, ID number, or reference code.
        </p>
      </section>

      <p className="mt-8 text-sm text-slate-600">
        Take a seat in the waiting area. You will be called by name when it is your turn.
        If you have any questions, speak to a member of staff at the front desk and show
        them your reference code.
      </p>
    </main>
  );
}
