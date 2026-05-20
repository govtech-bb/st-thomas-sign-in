import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth-server";
import { listTodayEntries } from "@/lib/queue";
import { PharmacyQueue } from "@/components/PharmacyQueue";

export const dynamic = "force-dynamic";

export default async function PharmacyPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff");
  if (session.role === "clinician") redirect("/staff");

  const all = await listTodayEntries();
  const entries = all.filter((e) => e.visit_type === "pharmacy");
  return <PharmacyQueue initialEntries={entries} email={session.email} role={session.role} />;
}
