import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { BottomNav } from "@/components/ui/BottomNav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.accountStatus === "incomplete_onboarding") {
    redirect("/onboarding");
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
