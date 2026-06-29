import { redirect } from "next/navigation";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // middleware に加えた二重チェック
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/records-login");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">学習記録・面談管理</h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
          {user.name}
          {user.role === "SUPER_ADMIN" && "（最上級管理者）"}
        </span>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
