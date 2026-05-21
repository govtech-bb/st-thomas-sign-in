import { SignInForm } from "@/components/SignInForm";
import { PoweredBy } from "@/components/PoweredBy";

interface Props {
  searchParams?: { kiosk?: string };
}

export default function HomePage({ searchParams }: Props) {
  const kiosk = searchParams?.kiosk === "true";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">Check in for your visit</h1>
        <p className="mt-3 text-slate-600">
          Enter your name and the type of your visit to join the queue. You can find
          your place again at any time using your name, ID number, or reference code.
        </p>
      </header>

      <SignInForm kiosk={kiosk} />

      <footer className="mt-12 text-center text-xs text-slate-500">
        Your name is only shown to clinic staff. The waiting-room display shows your
        initials only.
      </footer>

      <PoweredBy className="mt-8" />
    </main>
  );
}
