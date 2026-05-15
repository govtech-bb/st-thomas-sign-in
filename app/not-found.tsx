import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-slate-600">
        The page you tried to open doesn&apos;t exist or has been reset for the day.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Back to sign-in
      </Link>
    </main>
  );
}
