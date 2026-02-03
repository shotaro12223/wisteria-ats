"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace("/client/dashboard");
  }, [router]);

  return null;
}
