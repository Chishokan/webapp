import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function RegisterPage() {
  if (await getSession()) redirect("/");
  return <AuthForm mode="register" />;
}
