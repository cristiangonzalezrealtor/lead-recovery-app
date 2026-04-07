import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Root() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.brandProfile) redirect("/setup/welcome");
  redirect("/dashboard");
}
