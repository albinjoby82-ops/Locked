"use client";

/**
 * Next 16 synthesises a /_global-error page when the app doesn't define one.
 * The synthetic version renders outside this app's providers, so any context
 * hook in the layout chain resolves to null and prerendering fails.
 *
 * Defining it explicitly — deliberately self-contained, with no providers,
 * i18n or shared components — keeps the build working.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Something broke</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>{error?.digest ? `Error ${error.digest}` : "Unexpected error."}</p>
        <button
          onClick={() => reset()}
          style={{ marginTop: "1.5rem", padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
          type="button"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
