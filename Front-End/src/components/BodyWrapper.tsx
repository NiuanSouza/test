"use client";

import { usePathname } from "next/navigation";
import React, { useEffect } from "react";

export function BodyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // auth pages
    if (pathname === "/login" || pathname === "/reset-password" || pathname === "/") {
      document.body.className = "auth-body";
    } else {
      document.body.className = "app-body";
    }
  }, [pathname]);

  return <>{children}</>;
}
