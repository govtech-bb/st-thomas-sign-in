import { staffLoginAction } from "@/app/actions";

interface Props {
  error?: string;
}

function errorMessage(code?: string): string | null {
  if (!code) return null;
  if (code === "missing") return "Enter both email and password.";
  if (code === "invalid") return "Email or password is incorrect.";
  if (code === "unprovisioned") return "This account isn't set up for staff access. Ask an admin.";
  return "Sign-in failed. Try again.";
}

export function StaffLogin({ error }: Props) {
  const msg = errorMessage(error);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold">Clinic sign-in</h1>
      <p className="mt-2 text-slate-600">
        Sign in with your clinic email to access the queue dashboard.
      </p>

      <form action={staffLoginAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field-input"
          />
        </div>
        {msg && (
          <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700">
            {msg}
          </p>
        )}
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </main>
  );
}
