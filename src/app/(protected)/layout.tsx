import { BottomNav } from "@/components/ui/BottomNav";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
