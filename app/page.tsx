import { SignInForm } from "@/components/SignInForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">Sign in for your visit</h1>
        <p className="mt-3 text-slate-600">
          Enter your name and the reason for your visit. You&apos;ll get a personal link
          to track your place in the queue from your phone.
        </p>
      </header>

      <SignInForm />

      <footer className="mt-12 text-xs text-slate-500">
        Your name is only shown to clinic staff. The waiting-room display shows your
        initials.
      </footer>
    </main>
  );
}
