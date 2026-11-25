"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const PROTECTED = ["/pipelines", "/shap"];

/** Redirects signed-out visitors away from the console pages to /login (guests are allowed through). */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, isAllowed } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (ready && needsAuth && !isAllowed) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, needsAuth, isAllowed, pathname, router]);

  if (needsAuth && (!ready || !isAllowed)) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 font-mono text-xs text-slate-500 dark:text-[#94A3B8]">
        Checking session…
      </div>
    );
  }
  return <>{children}</>;
}
