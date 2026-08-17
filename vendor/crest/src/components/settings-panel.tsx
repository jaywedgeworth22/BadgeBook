import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { backupFilename, contactsToVcard, downloadVcard } from "@/lib/vcard";
import { formatBytes } from "@/lib/vcard-import";
import { describeImport, googleExportHelp, importAddressFile } from "@/lib/import-sources";
import { importGoogleContacts } from "@/lib/google-contacts";
import { classifyContact } from "@/lib/contacts";
import { fetchLogoStats } from "@/lib/logos";
import { canPickDeviceContacts, pickDeviceContacts } from "@/lib/picker";
import { deviceKind, platformCopy } from "@/lib/platform";
import { pauseCrestPersist, resumeCrestPersist } from "@/lib/idb-storage";
import { useCrest, useStats } from "@/store/crest";

export function SettingsPanel() {
  const contacts = useCrest((s) => s.contacts);
  const resetSample = useCrest((s) => s.resetSample);
  const lastBackup = useCrest((s) => s.lastBackup);
  const createBackup = useCrest((s) => s.createBackup);
  const restoreBackup = useCrest((s) => s.restoreBackup);
  const importContacts = useCrest((s) => s.importContacts);
  const stats = useStats();
  const { user, isPending } = useCurrentUserState();
  const [importing, setImporting] = useState<string | null>(null);
  const [library, setLibrary] = useState({ cached: 0, domains: 0 });
  const [deviceOk] = useState(() => canPickDeviceContacts());
  const vcfRef = useRef<HTMLInputElement>(null);
  const copy = platformCopy(deviceKind());

  useEffect(() => {
    void fetchLogoStats().then(setLibrary);
  }, []);

  function exportFilled() {
    const filled = contacts.filter((c) => c.photoDataUrl && classifyContact(c).isCompany);
    if (filled.length === 0) {
      toast.error("No company photos to export yet.");
      return;
    }
    const backup = createBackup("before-save");
    downloadVcard(backupFilename(), contactsToVcard(backup.contacts));
    downloadVcard("crest-companies.vcf", contactsToVcard(filled));
    toast.success("Backup saved, then the updated company cards.");
  }

  function downloadBackupNow() {
    const backup = createBackup("manual");
    downloadVcard(backupFilename(), contactsToVcard(backup.contacts));
    toast.success("Backup card saved on this device.");
  }

  async function importFromPhone() {
    try {
      createBackup("before-import");
      const incoming = await pickDeviceContacts();
      const added = importContacts(incoming);
      toast.success(
        added === 0
          ? "Those contacts are already in Crest"
          : `Imported ${added} contact${added === 1 ? "" : "s"} from this phone`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read contacts");
    }
  }

  async function importVcf(file: File) {
    setImporting(`Reading ${formatBytes(file.size)}…`);
    pauseCrestPersist();
    try {
      const result = await importAddressFile(file, {
        onProgress: (p) => {
          const pct = p.totalBytes ? Math.round((p.bytesRead / p.totalBytes) * 100) : 0;
          setImporting(`Reading ${formatBytes(file.size)} · ${p.found} · ${pct}%`);
        },
      });
      if (result.contacts.length === 0) {
        toast.error("No contacts found in that file.");
        return;
      }
      if (contacts.length <= 400) {
        try {
          createBackup("before-import");
        } catch {
          /* ignore */
        }
      }
      const added = importContacts(result.contacts);
      toast.success(describeImport(added, result.contacts, result.skippedPhotos));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that contact file.");
    } finally {
      resumeCrestPersist();
      setImporting(null);
    }
  }

  async function importFromGoogle() {
    setImporting("Connecting to Google…");
    pauseCrestPersist();
    try {
      const incoming = await importGoogleContacts((n) => setImporting(`Reading Google Contacts · ${n}`));
      if (incoming.length === 0) {
        toast.error("No contacts in that Google account.");
        return;
      }
      if (contacts.length <= 400) {
        try {
          createBackup("before-import");
        } catch {
          /* ignore */
        }
      }
      const added = importContacts(incoming);
      toast.success(describeImport(added, incoming, 0));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "GOOGLE_CONTACTS_NOT_CONFIGURED") {
        toast.message("Export from Google Contacts, then pick the vCard or CSV.");
        googleExportHelp();
        vcfRef.current?.click();
        return;
      }
      toast.error(message || "Could not read Google Contacts");
    } finally {
      resumeCrestPersist();
      setImporting(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-3xl font-medium tracking-tight">Settings</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Crest works as an iPhone app, an Android app, or a website. Pull Google
        Contacts, import from this phone, or drop a contact card. Photos go back
        out the same way. Existing pictures are never replaced unless you say so.
      </p>

      <section className="mt-6 overflow-hidden rounded-xl bg-elevated shadow-card">
        <StatRow label="Contacts" value={stats.total} />
        <StatRow label="Companies" value={stats.companies} />
        <StatRow label="Photos applied" value={stats.filled} />
        <StatRow label="Still missing" value={stats.missing} last />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl bg-elevated shadow-card">
        <StatRow label="Marks in library" value={library.cached} />
        <StatRow label="Brands cached" value={library.domains} last />
      </section>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Transparent iconic marks rank first — CompaniesLogo, Simple Icons, then
        favicons. Once a logo is fetched or uploaded, Crest keeps the original
        file so it never re-hits the same vendor. Cards without email still
        match by company name or phone.
      </p>

      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">{copy.title}</h2>
        <div className="mt-2 overflow-hidden rounded-xl bg-elevated shadow-card">
          <p className="border-b border-line px-4 py-3 text-sm leading-relaxed text-muted">
            {copy.install} {copy.import}
          </p>
          <div className="flex flex-col gap-2 p-3">
            {deviceOk && (
              <Button variant="secondary" onClick={() => void importFromPhone()}>
                Import from this phone
              </Button>
            )}
            <Button variant="secondary" disabled={Boolean(importing)} onClick={() => void importFromGoogle()}>
              {importing?.includes("Google") ? importing : "Import Google Contacts"}
            </Button>
            <Button variant="secondary" disabled={Boolean(importing)} onClick={() => vcfRef.current?.click()}>
              {importing && !importing.includes("Google") ? importing : "Import contact card or CSV"}
            </Button>
            <Button variant="secondary" onClick={exportFilled}>
              Download company cards
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Backup</h2>
        <div className="mt-2 overflow-hidden rounded-xl bg-elevated shadow-card">
          <p className="border-b border-line px-4 py-3 text-sm leading-relaxed text-muted">
            Crest snapshots your address book before a scan, an import, a reset,
            or a write to Contacts. Restore the last snapshot if something looks wrong.
          </p>
          {lastBackup && (
            <p className="border-b border-line px-4 py-2 text-xs text-muted">
              Last backup · {new Date(lastBackup.createdAt).toLocaleString()} ·{" "}
              {lastBackup.contacts.length} contacts
            </p>
          )}
          <div className="flex flex-col gap-2 p-3">
            <Button variant="secondary" onClick={downloadBackupNow}>
              Download backup now
            </Button>
            <Button
              variant="secondary"
              disabled={!lastBackup}
              onClick={() => {
                if (restoreBackup()) toast.success("Restored the last backup");
                else toast.error("No backup to restore");
              }}
            >
              Restore last backup
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Account</h2>
        <div className="mt-2 rounded-xl bg-elevated p-4 shadow-card">
          {isPending ? (
            <div className="h-8 w-40 animate-pulse rounded-md bg-line" />
          ) : (
            <>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <p className="text-sm text-muted">
                  Sign in to keep an account on this app. The address book itself
                  stays on the device.
                </p>
                <Button asChild variant="secondary" className="mt-3">
                  <Link to="/login">{user ? "Account" : "Sign in"}</Link>
                </Button>
              </SignedOut>
            </>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">Sample book</h2>
        <div className="mt-2 rounded-xl bg-elevated p-4 shadow-card">
          <p className="text-sm leading-relaxed text-muted">
            Restore the demo address book of airlines, banks, shops, and people.
            Your added contacts will be replaced. A backup is taken first.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              createBackup("before-reset");
              resetSample();
              toast("Sample address book restored");
            }}
          >
            Restore sample contacts
          </Button>
        </div>
      </section>

      <input
        ref={vcfRef}
        type="file"
        accept=".vcf,.vcard,.csv,text/vcard,text/x-vcard,text/csv,text/plain,application/octet-stream"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importVcf(file);
        }}
      />
    </div>
  );
}

function StatRow({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
