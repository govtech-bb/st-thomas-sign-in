"use client";

import { useState, useTransition } from "react";
import { signInAction } from "@/app/actions";
import { VISIT_TYPES } from "@/lib/types";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await signInAction(formData);
      } catch (err) {
        // redirect() throws a NEXT_REDIRECT signal that the framework handles;
        // surface only real failures to the user.
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
    <form action={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="field-label">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          className="field-input"
          placeholder="e.g. Karen Williams"
        />
      </div>

      <fieldset>
        <legend className="field-label">Type of visit</legend>
        <div className="mt-3 space-y-2">
          {VISIT_TYPES.map((v) => (
            <label
              key={v.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-300 px-4 py-3 text-base has-[:checked]:border-brand has-[:checked]:bg-brand-light"
            >
              <input
                type="radio"
                name="visit_type"
                value={v.value}
                required
                className="h-5 w-5 accent-brand"
              />
              <span>{v.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full text-lg" disabled={pending}>
        {pending ? "Signing in..." : "Join the queue"}
      </button>
    </form>
  );
}
