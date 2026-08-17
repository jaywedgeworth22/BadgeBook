import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/google/config")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

async function handleGet(): Promise<Response> {
  const clientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CONTACTS_CLIENT_ID ||
    process.env.VITE_GOOGLE_CONTACTS_CLIENT_ID ||
    ""
  ).trim();
  return Response.json({ clientId, configured: Boolean(clientId) });
}
