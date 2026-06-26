import { redirect } from "next/navigation";
import { isManageAuthed, isManageConfigured } from "@/lib/manage-auth";
import { ManageLoginForm } from "@/components/manage/ManageLoginForm";

export default async function ManageLoginPage() {
  if (await isManageAuthed()) redirect("/manage");
  return <ManageLoginForm configured={isManageConfigured()} />;
}
