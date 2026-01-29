"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        textAlign: "center",
        background: "#09090b",
        color: "#fafafa",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#a1a1aa", maxWidth: "28rem", marginBottom: "1.5rem" }}>
        An unexpected error occurred. You can try again, or return to the home page if the problem
        persists.
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid #27272a",
            background: "#18181b",
            color: "#fafafa",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#fafafa",
            color: "#09090b",
            textDecoration: "none",
            fontSize: "0.875rem",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
