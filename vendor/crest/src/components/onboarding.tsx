import { useState } from "react";
import { Building2, ImagePlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrest } from "@/store/crest";

const STEPS = [
  {
    title: "Companies hide in your address book",
    body: "Utilities, airlines, banks, and shops sit next to friends — usually as a gray initial, never a logo.",
    icon: Building2,
  },
  {
    title: "Crest finds the companies",
    body: "Names, legal suffixes, work emails, and a catalog of well-known firms are used to tell a company from a person.",
    icon: ImagePlus,
  },
  {
    title: "Works on iPhone, Android, and the web",
    body: "Import real contacts from the phone or a contact card. Crest snapshots a backup before any edit. You approve every mark — uploads stay on screen so you can see how they look.",
    icon: Smartphone,
  },
];

export function Onboarding() {
  const complete = useCrest((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <div className="relative h-[42dvh] min-h-56 overflow-hidden">
        <img
          src={step === 2 ? "/crest-card.jpg" : "/crest-desk.jpg"}
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-bg" />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="font-display text-sm tracking-wide text-accent">Crest</p>
        <h1 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-ink">
          {current.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">{current.body}</p>
        <div className="mt-6 flex items-center gap-2 text-muted">
          <Icon className="size-4" />
          <span className="text-xs font-medium tracking-wide uppercase">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`}
            />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-8">
          {step < STEPS.length - 1 ? (
            <Button size="lg" onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button size="lg" onClick={complete}>
              Open my address book
            </Button>
          )}
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
