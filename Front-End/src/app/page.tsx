"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.permission === "MANAGER" || user.permission === "ADMIN") {
          router.replace("/dashboard");
        } else {
          router.replace("/home");
        }
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return null;
}
