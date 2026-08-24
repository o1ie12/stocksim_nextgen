import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginClient } from "@/components/LoginClient";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "teacher" ? "/teacher" : "/dashboard");
  return <LoginClient />;
}
