"use client";

import { useEffect, useState, useTransition } from "react";
import { signInAction } from "@/app/actions";
import { PRESCRIPTION_OPTIONS, VISIT_TYPES } from "@/lib/types";

interface Props {
  kiosk?: boolean;
}

export function SignInForm({ kiosk }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [idType, setIdType] = useState<"national_id" | "passport">("national_id");
  const [visitType, setVisitType] = useState<string>("");

  useEffect(() => {
    if (kiosk) {
      localStorage.setItem("kiosk", "true");
    }
  }, [kiosk]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await signInAction(formData);
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

      <div>
        <span className="field-label block mb-2">Identification Number</span>
        <div className="flex gap-3 mb-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-light border-slate-300">
            <input
              type="radio"
              name="id_type"
              value="national_id"
              checked={idType === "national_id"}
              onChange={() => setIdType("national_id")}
              className="h-4 w-4 accent-brand"
            />
            National ID #
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-light border-slate-300">
            <input
              type="radio"
              name="id_type"
              value="passport"
              checked={idType === "passport"}
              onChange={() => setIdType("passport")}
              className="h-4 w-4 accent-brand"
            />
            Passport Number
          </label>
        </div>
        <input
          id="id_number"
          name="id_number"
          type="text"
          required
          maxLength={30}
          className="field-input"
          placeholder={idType === "national_id" ? "e.g. 1234567890" : "e.g. A1234567"}
        />
      </div>

      <fieldset>
        <legend className="field-label">Type of visit</legend>
        <div className="mt-3 space-y-2">
          {VISIT_TYPES.map((v) => (
            <label
              key={v.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 px-4 py-3 text-base has-[:checked]:border-brand has-[:checked]:bg-brand-light"
            >
              <input
                type="radio"
                name="visit_type"
                value={v.value}
                required
                checked={visitType === v.value}
                onChange={() => setVisitType(v.value)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
              />
              <span className="flex flex-col">
                <span className="font-medium">{v.label}</span>
                <span className="text-sm text-slate-500">{v.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {visitType === "pharmacy" && (
        <fieldset>
          <legend className="field-label">Do you have a prescription?</legend>
          <div className="mt-3 space-y-2">
            {PRESCRIPTION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-300 px-4 py-3 text-base has-[:checked]:border-brand has-[:checked]:bg-brand-light"
              >
                <input
                  type="radio"
                  name="has_prescription"
                  value={opt.value}
                  required
                  className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-sm text-slate-500">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-red-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full text-lg" disabled={pending}>
        {pending ? "Checking in..." : "Check in"}
      </button>
    </form>
  );
}
