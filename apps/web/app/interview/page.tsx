"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InterviewIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if someone lands here directly
    // They should start a new session from the home page
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
