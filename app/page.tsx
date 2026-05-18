import { headers } from "next/headers";
import QRCodeLib from "qrcode";
import { SignInForm } from "@/components/SignInForm";

export const dynamic = "force-dynamic";

function resolveBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function HomePage() {
  const signInUrl = `${resolveBaseUrl()}/`;
  const qrSvg = await QRCodeLib.toString(signInUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b6e4f", light: "#ffffff" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <header className="mb-10">
        <p className="text-lg font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-3 text-5xl font-bold leading-tight">Sign in for your visit</h1>
        <p className="mt-5 text-2xl text-slate-600">
          Enter your name and the reason for your visit. You&apos;ll get a personal link
          to track your place in the queue from your phone.
        </p>
      </header>

      <SignInForm />

      <section className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-6">
          <div
            className="h-32 w-32 shrink-0 rounded-md bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div>
            <h2 className="text-2xl font-bold">Prefer to use your phone?</h2>
            <p className="mt-2 text-lg text-slate-700">
              Scan this code with your phone camera to sign in from there instead.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
