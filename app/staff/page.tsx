import { isStaffAuthenticated } from "@/lib/staff";
import { listTodayEntries } from "@/lib/queue";
import { StaffLogin, type StaffLoginError } from "@/components/StaffLogin";
import { StaffQueue } from "@/components/StaffQueue";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { error?: string };
}

function parseError(value: string | undefined): StaffLoginError | undefined {
  if (value === "1") return "invalid";
  if (value === "locked") return "locked";
  if (value === "config") return "config";
  return undefined;
}

export default async function StaffPage({ searchParams }: Props) {
  if (!(await isStaffAuthenticated())) {
    return <StaffLogin error={parseError(searchParams.error)} />;
  }
  const entries = await listTodayEntries();
  return <StaffQueue initialEntries={entries} />;
}
