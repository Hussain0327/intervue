export default function NotFound() {
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
      <p style={{ fontSize: "5rem", fontWeight: 700, margin: 0, lineHeight: 1, color: "#27272a" }}>
        404
      </p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.5rem" }}>
        Page not found
      </h1>
      <p style={{ color: "#a1a1aa", maxWidth: "24rem", marginBottom: "1.5rem" }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
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
        }}
      >
        Back to home
      </a>
    </div>
  );
}
