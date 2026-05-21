import { SignInForm } from "@/components/SignInForm";

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
          Enter your name and the reason for your visit. You&apos;ll get a personal link
          to track your place in the queue from your phone.
        </p>
      </header>

      <SignInForm kiosk={kiosk} />

      <footer className="mt-12 text-center text-xs text-slate-500">
        Your name is only shown to clinic staff. The waiting-room display shows your initials.
        <div className="mt-4">
          <a href="/lookup" className="text-sm font-semibold text-brand hover:underline">
            Already checked in? Find my place in queue →
          </a>
        </div>
      </footer>
    </main>
  );
}
