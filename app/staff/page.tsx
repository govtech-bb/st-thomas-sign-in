import { isStaffAuthenticated } from "@/lib/staff";
import { listTodayEntries } from "@/lib/queue";
import { StaffLogin } from "@/components/StaffLogin";
import { StaffQueue } from "@/components/StaffQueue";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { error?: string };
}

export default async function StaffPage({ searchParams }: Props) {
  if (!isStaffAuthenticated()) {
    return <StaffLogin error={searchParams.error === "1"} />;
  }
  const entries = await listTodayEntries();
  return <StaffQueue initialEntries={entries} />;
}
