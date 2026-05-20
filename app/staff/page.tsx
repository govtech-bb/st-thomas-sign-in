import { isStaffAuthenticated } from "@/lib/staff";
import { listTodayEntries } from "@/lib/queue";
import { StaffLogin } from "@/components/StaffLogin";
import { StaffQueue } from "@/components/StaffQueue";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function StaffPage({ searchParams }: Props) {
  if (!(await isStaffAuthenticated())) {
    const { error } = await searchParams;
    return <StaffLogin error={error === "1"} />;
  }
  const entries = await listTodayEntries();
  return <StaffQueue initialEntries={entries} />;
}
