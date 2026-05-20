import { staffLoginAction } from "@/app/actions";

export type StaffLoginError = "invalid" | "locked" | "config";

interface Props {
  error?: StaffLoginError;
}

const ERROR_MESSAGES: Record<StaffLoginError, string> = {
  invalid: "Incorrect PIN. Try again.",
  locked:
    "Too many failed attempts from this network. Try again in a few minutes.",
  config:
    "Staff PIN is misconfigured on the server. Ask an administrator to set a strong STAFF_PIN.",
};

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
            {ERROR_MESSAGES[error]}
          </p>
        )}
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </main>
  );
}
