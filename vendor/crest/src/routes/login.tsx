import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <img
        src="/crest-seal.jpg"
        alt=""
        className="mx-auto size-28 rounded-full object-cover ring-1 ring-line"
      />
      <h1 className="mt-6 text-center font-display text-3xl font-medium tracking-tight">
        Sign in to Crest
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-muted">
        Optional. The address book stays on this device either way.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
            >
              Continue with {p.label}
            </Button>
          ))
        ) : (
          <p className="text-center text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
      <Button asChild variant="ghost" className="mt-auto">
        <Link to="/">Back to contacts</Link>
      </Button>
    </main>
  );
}
