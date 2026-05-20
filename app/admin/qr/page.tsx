import { headers } from "next/headers";
import QRCodeLib from "qrcode";
import { QRCode } from "@/components/QRCode";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

async function resolveBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function AdminQrPage() {
  const baseUrl = await resolveBaseUrl();
  const signInUrl = `${baseUrl}/`;
  const svg = await QRCodeLib.toString(signInUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b6e4f", light: "#ffffff" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:py-0">
      <div className="print:hidden">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-1 text-3xl font-bold">Sign-in QR code</h1>
        <p className="mt-2 text-slate-600">
          Print this page and display it at the front desk. Patients scan to sign in.
        </p>
        <div className="mt-4 flex gap-3">
          <PrintButton />
        </div>
      </div>

      <section className="mt-10 rounded-lg border border-slate-200 p-8 print:mt-0 print:border-0 print:p-0">
        <div className="text-center">
          <h2 className="text-2xl font-bold">St Thomas Outpatient Clinic</h2>
          <p className="mt-1 text-slate-700">Scan to sign in for your visit</p>
        </div>
        <div className="mt-8">
          <QRCode svg={svg} url={signInUrl} />
        </div>
        <ol className="mt-8 space-y-2 text-base text-slate-700">
          <li>1. Open your phone camera and point it at the code.</li>
          <li>2. Tap the link that appears.</li>
          <li>3. Enter your name and the reason for your visit.</li>
          <li>4. Keep the page open to see your queue position.</li>
        </ol>
      </section>
    </main>
  );
}
