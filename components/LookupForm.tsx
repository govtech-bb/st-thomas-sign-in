"use client";

import { useState, useTransition } from "react";
import { lookupPatientAction } from "@/app/actions";

export function LookupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await lookupPatientAction(formData);
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="id_number" className="field-label">
          Your National ID # or Passport Number
        </label>
        <input
          id="id_number"
          name="id_number"
          type="text"
          required
          maxLength={30}
          className="field-input"
          placeholder="Enter the ID you used to sign in"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full text-lg" disabled={pending}>
        {pending ? "Looking up…" : "Find my place"}
      </button>
    </form>
  );
}
