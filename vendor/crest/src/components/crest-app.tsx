import { useEffect } from "react";
import { BookUser, ImagePlus, Plus, Search, Settings } from "lucide-react";
import { ContactAvatar } from "@/components/contact-avatar";
import { AddContact } from "@/components/add-contact";
import { ContactDetail } from "@/components/contact-detail";
import { Onboarding } from "@/components/onboarding";
import { ScanFlow } from "@/components/scan-flow";
import { SettingsPanel } from "@/components/settings-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyContact, needsPhoto } from "@/lib/contacts";
import { cn } from "@/lib/utils";
import { useCrest, useStats, useVisibleContacts, type AppView, type FilterTab } from "@/store/crest";

export function CrestApp() {
  const hydrated = useCrest((s) => s.hydrated);
  const onboarded = useCrest((s) => s.onboarded);
  const view = useCrest((s) => s.view);
  const markHydrated = useCrest((s) => s.markHydrated);

  useEffect(() => {
    const finish = () => markHydrated();
    const unsub = useCrest.persist.onFinishHydration(finish);
    if (useCrest.persist.hasHydrated()) finish();
    const fallback = window.setTimeout(finish, 2500);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, [markHydrated]);

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <div className="h-10 w-36 rounded-md crest-shimmer bg-line" />
      </div>
    );
  }

  if (!onboarded) return <Onboarding />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-bg">
      {view === "home" && <HomeScreen />}
      {view === "scan" && <ScanFlow />}
      {view === "settings" && <SettingsPanel />}
      {view === "detail" && <ContactDetail />}
      {view === "add" && <AddContact />}
      {(view === "home" || view === "scan" || view === "settings") && <TabBar />}
    </div>
  );
}

function HomeScreen() {
  const query = useCrest((s) => s.query);
  const setQuery = useCrest((s) => s.setQuery);
  const filter = useCrest((s) => s.filter);
  const setFilter = useCrest((s) => s.setFilter);
  const setView = useCrest((s) => s.setView);
  const openContact = useCrest((s) => s.openContact);
  const contacts = useVisibleContacts();
  const stats = useStats();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-accent uppercase">Crest</p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">Contacts</h1>
          </div>
          <Button variant="ghost" size="icon" aria-label="Add contact" onClick={() => setView("add")}>
            <Plus />
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company"
            className="pl-9"
            aria-label="Search contacts"
          />
        </div>
        <div className="mt-3 flex gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          <FilterChip
            active={filter === "companies"}
            onClick={() => setFilter("companies")}
            label={`Companies ${stats.companies}`}
          />
          <FilterChip
            active={filter === "needs"}
            onClick={() => setFilter("needs")}
            label={`Needs photo ${stats.missing}`}
          />
        </div>
      </header>

      {stats.missing > 0 && filter !== "needs" && (
        <div className="px-5 pt-4">
          <button
            type="button"
            onClick={() => setView("scan")}
            className="flex w-full items-center gap-3 rounded-xl bg-accent px-4 py-3 text-left text-accent-fg"
          >
            <span className="grid size-10 place-items-center rounded-full bg-elevated/15">
              <ImagePlus className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Fill company photos</span>
              <span className="block text-xs text-accent-fg/75">
                {stats.missing} compan{stats.missing === 1 ? "y" : "ies"} still using initials
              </span>
            </span>
          </button>
        </div>
      )}

      <ul className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {contacts.length === 0 ? (
          <li className="px-2 py-16 text-center text-sm text-muted">
            No contacts match this filter.
          </li>
        ) : (
          <>
            {contacts.slice(0, 80).map((c, i) => {
              const cls = classifyContact(c);
              const missing = needsPhoto(c, cls);
              return (
                <li key={c.id} className="crest-rise" style={{ animationDelay: `${Math.min(i, 12) * 24}ms` }}>
                  <button
                    type="button"
                    onClick={() => openContact(c.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-elevated"
                  >
                    <ContactAvatar contact={c} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {cls.isCompany
                          ? missing
                            ? "Company · missing photo"
                            : cls.domain ?? "Company"
                          : c.email ?? c.phone ?? "Person"}
                      </span>
                    </span>
                    {missing && <span className="size-2 shrink-0 rounded-full bg-rose" />}
                  </button>
                </li>
              );
            })}
            {contacts.length > 80 && (
              <li className="px-2 py-4 text-center text-xs text-muted">
                Showing 80 of {contacts.length.toLocaleString()}. Search to find someone.
              </li>
            )}
          </>
        )}
      </ul>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-medium",
        active ? "bg-accent text-accent-fg" : "bg-surface text-muted",
      )}
    >
      {label}
    </button>
  );
}

function TabBar() {
  const view = useCrest((s) => s.view);
  const setView = useCrest((s) => s.setView);
  const tabs: { id: AppView; label: string; icon: typeof BookUser }[] = [
    { id: "home", label: "Contacts", icon: BookUser },
    { id: "scan", label: "Fill", icon: ImagePlus },
    { id: "settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav className="grid grid-cols-3 border-t border-line bg-surface/90 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const on = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium",
              on ? "text-accent" : "text-subtle",
            )}
          >
            <Icon className="size-5" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export type { FilterTab };
