import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  // Custom Redirect Logic
  // @ts-ignore
  const role = session?.user?.role;

  if (role === 'DOMICILIARIO') {
    redirect("/logistics");
  } else {
    redirect("/dashboard");
  }
}
