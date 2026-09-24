"use client";
import { usePathname } from 'next/navigation';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/onboarding';

  return (
    <main className={isAuthPage ? "" : "w-full relative min-h-[calc(100vh-64px)]"}>
      {children}
    </main>
  );
}
