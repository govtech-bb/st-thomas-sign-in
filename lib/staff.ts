import { cookies } from "next/headers";

export const STAFF_COOKIE = "stq_staff";

export function isStaffAuthenticated(): boolean {
  const pin = process.env.STAFF_PIN;
  if (!pin) return false;
  const cookie = cookies().get(STAFF_COOKIE);
  return cookie?.value === pin;
}

export function verifyPin(pin: string): boolean {
  const expected = process.env.STAFF_PIN;
  if (!expected) return false;
  return pin === expected;
}
