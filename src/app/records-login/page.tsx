import { redirect } from "next/navigation";
import { getSession, isStaffRole } from "@/lib/auth";
import { RecordsLoginForm } from "@/components/RecordsLoginForm";

export default async function RecordsLoginPage() {
  const session = await getSession();
  if (session && isStaffRole(session.role)) redirect("/admin");
  return <RecordsLoginForm />;
}
