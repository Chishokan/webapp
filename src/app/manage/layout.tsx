import { redirect } from "next/navigation";
import Link from "next/link";
import { getManageAccess } from "@/lib/manage-auth";
import { Logo } from "@/components/Logo";
import { ManageNav } from "@/components/manage/ManageNav";
import { ManageLogout } from "@/components/manage/ManageLogout";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getManageAccess();
  if (!access.ok) redirect("/manage-login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/manage" aria-label="管理トップ">
            <Logo />
          </Link>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            運営管理{access.isAdmin ? "（admin）" : "（staff）"}
          </span>
        </div>
        <ManageLogout />
      </div>
      <ManageNav isAdmin={access.isAdmin} />
      {children}
    </div>
  );
}
