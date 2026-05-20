import Link from "next/link";
import { LookupForm } from "@/components/LookupForm";

export default function LookupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          St Thomas Outpatient Clinic
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">Find my place in queue</h1>
        <p className="mt-3 text-slate-600">
          Enter the ID number you used when you signed in and we&apos;ll take you back to your queue position.
        </p>
      </header>

      <LookupForm />

      <p className="mt-6 text-center text-sm text-slate-500">
        Not signed in yet?{" "}
        <Link href="/" className="font-semibold text-brand hover:underline">
          Sign in here
        </Link>
      </p>
    </main>
  );
}
