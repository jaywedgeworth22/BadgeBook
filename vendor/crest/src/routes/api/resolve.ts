import { createFileRoute } from "@tanstack/react-router";
import { resolveByName, resolveByPhone } from "@/lib/identity.server";
import { lookupCompanyDomain } from "@/lib/contacts";
import { lookupPhoneDomain } from "@/lib/phones";

export const Route = createFileRoute("/api/resolve")({
  server: {
    handlers: {
      GET: handleGet,
    },
  },
});

async function handleGet({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const phone = (url.searchParams.get("phone") ?? "").trim();

  if (!name && !phone) {
    return Response.json({ error: "name or phone required" }, { status: 400 });
  }

  if (phone) {
    const catalog = lookupPhoneDomain(phone);
    if (catalog) {
      return Response.json({ domain: catalog, source: "catalog", label: name || undefined });
    }
  }

  if (name) {
    const known = lookupCompanyDomain(name);
    if (known) {
      return Response.json({ domain: known, source: "catalog", label: name });
    }
  }

  if (name) {
    const byName = await resolveByName(name);
    if (byName) {
      return Response.json({
        domain: byName.domain,
        source: byName.source,
        label: byName.label ?? name,
      });
    }
  }

  if (phone) {
    const byPhone = await resolveByPhone(phone);
    if (byPhone) {
      return Response.json({
        domain: byPhone.domain,
        source: byPhone.source,
        label: byPhone.label ?? (name || undefined),
      });
    }
  }

  return Response.json({ domain: null, source: null }, { status: 404 });
}
