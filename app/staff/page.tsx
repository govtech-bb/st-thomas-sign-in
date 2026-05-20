import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth-server";
import { listTodayEntries } from "@/lib/queue";
import { StaffLogin } from "@/components/StaffLogin";
import { StaffQueue } from "@/components/StaffQueue";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { error?: string };
}

export default async function StaffPage({ searchParams }: Props) {
  const session = await getStaffSession();
  if (!session) {
    return <StaffLogin error={searchParams.error} />;
  }
  if (session.role === "pharmacist") {
    redirect("/pharmacy");
  }
  const entries = await listTodayEntries();
  return <StaffQueue initialEntries={entries} role={session.role} email={session.email} />;
}
