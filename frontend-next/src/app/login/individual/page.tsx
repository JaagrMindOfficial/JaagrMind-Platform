"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function IndividualLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?tab=individual");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500 mx-auto" />
        <p className="text-xs text-muted-foreground">Loading Individual & Family Portal...</p>
      </div>
    </div>
  );
}
