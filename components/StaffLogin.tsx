import { staffLoginAction } from "@/app/actions";

interface Props {
  error?: boolean;
}

export function StaffLogin({ error }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold">Staff sign-in</h1>
      <p className="mt-2 text-slate-600">
        Enter the clinic PIN to access the queue dashboard.
      </p>

      <form action={staffLoginAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="pin" className="field-label">
            PIN
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            required
            className="field-input"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700">
            Incorrect PIN. Try again.
          </p>
        )}
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </main>
  );
}
