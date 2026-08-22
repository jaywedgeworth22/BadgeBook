import { useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, CloudDownload, FileUp, LoaderCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/contact-avatar";
import { ReviewActions } from "@/components/review-actions";
import { classifyContact, hasExistingPhoto } from "@/lib/contacts";
import { composeContactPhoto, composeFromFile, sourceLabel, viaLabel, uploadLogoToLibrary } from "@/lib/logos";
import { canPickDeviceContacts, pickDeviceContacts } from "@/lib/picker";
import { backupFilename, contactsToVcard, downloadVcard, shareVcard } from "@/lib/vcard";
import { formatBytes } from "@/lib/vcard-import";
import { describeImport, googleExportHelp, importAddressFile } from "@/lib/import-sources";
import { importGoogleContacts } from "@/lib/google-contacts";
import { deviceKind, platformCopy } from "@/lib/platform";
import { pauseCrestPersist, resumeCrestPersist } from "@/lib/idb-storage";
import { runCompanyScan, type ScanItem } from "@/lib/scan";
import { collectScanTargets, useCrest, useStats } from "@/store/crest";

type Phase = "ready" | "running" | "review" | "empty" | "done";

export function ScanFlow() {
  const contacts = useCrest((s) => s.contacts);
  const setView = useCrest((s) => s.setView);
  const importContacts = useCrest((s) => s.importContacts);
  const applyPhoto = useCrest((s) => s.applyPhoto);
  const rejectSource = useCrest((s) => s.rejectSource);
  const createBackup = useCrest((s) => s.createBackup);
  const promoteAllCompanies = useCrest((s) => s.promoteAllCompanies);
  const stats = useStats();
  const [phase, setPhase] = useState<Phase>("ready");
  const [queue, setQueue] = useState<ScanItem[]>([]);
  const [index, setIndex] = useState(0);
  const [scanIndex, setScanIndex] = useState(0);
  const [scanName, setScanName] = useState("");
  const [scanTotal, setScanTotal] = useState(0);
  const [approved, setApproved] = useState(0);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [deviceOk] = useState(() => canPickDeviceContacts());
  const vcfRef = useRef<HTMLInputElement>(null);
  const copy = platformCopy(deviceKind());

  const current = queue[index];

  async function startScan() {
    setPhase("running");
    setQueue([]);
    setIndex(0);
    setApproved(0);
    setScanIndex(0);
    setScanName("Finding companies");
    setScanTotal(Math.max(stats.missing, 1));
    await new Promise((r) => setTimeout(r, 30));

    pauseCrestPersist();
    try {
      if (contacts.length <= 400) {
        try {
          createBackup("before-scan");
        } catch {
          /* large book — skip in-memory snapshot */
        }
      }

      promoteAllCompanies();
      const targets = collectScanTargets(useCrest.getState().contacts);
      setScanTotal(Math.max(targets.length, 1));
      if (targets.length === 0) {
        setPhase("empty");
        return;
      }

      const items = await runCompanyScan(targets, (i, contact) => {
        setScanIndex(i);
        setScanName(contact.name);
      });
      setQueue(items);
      setScanIndex(items.length);
      setPhase("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
      setPhase("ready");
    } finally {
      resumeCrestPersist();
    }
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
          setImporting(`Reading ${formatBytes(file.size)} · ${p.found} contacts · ${pct}%`);
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

  function advance() {
    if (index + 1 >= queue.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
  }

  function approve() {
    if (!current?.preview) return;
    applyPhoto(current.contact.id, current.preview, current.domain, current.source);
    if (!current.settled) setApproved((n) => n + 1);
    setQueue((items) =>
      items.map((item, i) => (i === index ? { ...item, settled: true } : item)),
    );
    advance();
  }

  async function retry() {
    if (!current?.domain) {
      toast.error("No domain to look up.");
      return;
    }
    setBusy(true);
    const skip = [
      ...(current.contact.rejectedSources ?? []),
      ...(current.source ? [current.source] : []),
    ];
    if (current.source) rejectSource(current.contact.id, current.source);
    try {
      const photo = await composeContactPhoto(current.domain, skip, current.contact.name);
      setQueue((items) =>
        items.map((item, i) =>
          i === index
            ? {
                ...item,
                preview: photo.dataUrl,
                source: photo.source,
                failed: false,
                settled: false,
                contact: {
                  ...item.contact,
                  proposedPhotoUrl: photo.dataUrl,
                  proposedSource: photo.source,
                  rejectedSources: skip,
                },
              }
            : item,
        ),
      );
    } catch {
      toast.error("No other mark in the library. Upload one, or skip.");
      setQueue((items) =>
        items.map((item, i) =>
          i === index
            ? { ...item, failed: true, settled: false, contact: { ...item.contact, rejectedSources: skip } }
            : item,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const composed = await composeFromFile(file);
      const domain = current?.domain ?? classifyContact(current.contact).domain;
      if (domain) {
        try {
          await uploadLogoToLibrary(domain, composed.original);
        } catch {
          /* local apply still wins */
        }
      }
      applyPhoto(current.contact.id, composed.preview, domain, "upload");
      setQueue((items) =>
        items.map((item, i) =>
          i === index
            ? {
                ...item,
                preview: composed.preview,
                source: "upload",
                failed: false,
                settled: true,
              }
            : item,
        ),
      );
      if (!current.settled) setApproved((n) => n + 1);
      toast.success("Approved — this is how it will look");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    advance();
  }

  async function saveToPhone() {
    const filled = useCrest.getState().contacts.filter((c) => c.crestApplied && c.photoDataUrl);
    if (filled.length === 0) {
      toast.error("Approve at least one photo first.");
      return;
    }
    const backup = createBackup("before-save");
    downloadVcard(backupFilename(), contactsToVcard(backup.contacts));
    try {
      await shareVcard("crest-companies.vcf", contactsToVcard(filled));
      toast.success("Backup saved. Open the new card to add photos on this phone.");
    } catch {
      toast.error("Save was cancelled. Your backup is still on this device.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => setView("home")} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="font-display text-xl font-medium tracking-tight">Fill photos</h1>
          <p className="text-xs text-muted">
            {phase === "review"
              ? `${index + 1} of ${queue.length}`
              : `${stats.total.toLocaleString()} contacts · ${stats.missing} compan${stats.missing === 1 ? "y" : "ies"} to fill`}
          </p>
        </div>
      </header>

      {phase === "ready" && (
        <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
          <div className="overflow-hidden rounded-xl bg-elevated shadow-card">
            <img src="/crest-card.jpg" alt="" className="h-40 w-full object-cover" />
            <div className="space-y-3 p-5">
              <h2 className="font-display text-2xl font-medium leading-snug">
                Review every mark before it lands on a contact
              </h2>
              <p className="text-sm leading-relaxed text-muted">{copy.import}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            <Step n="1">
              Pull Google Contacts, import from this phone, or drop a contact card
              — even an 80 MB iPhone export.
            </Step>
            <Step n="2">
              Scan matches a company by website, work email, name, or phone — then prefers
              transparent iconic marks.
            </Step>
            <Step n="3">
              Approve a new mark, or keep the photo that’s already there. Crest never
              overwrites an existing picture unless you tap Replace.
            </Step>
          </ul>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Button size="lg" disabled={contacts.length === 0 || Boolean(importing)} onClick={() => void startScan()}>
              {stats.missing > 0
                ? `Scan ${stats.missing} compan${stats.missing === 1 ? "y" : "ies"}`
                : `Scan ${stats.total.toLocaleString()} contacts`}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={Boolean(importing)}
              onClick={() => void importFromGoogle()}
            >
              <CloudDownload />
              {importing?.includes("Google") ? importing : "Import Google Contacts"}
            </Button>
            {deviceOk && (
              <Button variant="secondary" size="lg" disabled={Boolean(importing)} onClick={() => void importFromPhone()}>
                <Smartphone />
                Import from this phone
              </Button>
            )}
            <Button variant="secondary" size="lg" disabled={Boolean(importing)} onClick={() => vcfRef.current?.click()}>
              <FileUp />
              {importing && !importing.includes("Google") ? importing : "Import contact card or CSV"}
            </Button>
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
        </div>
      )}

      {phase === "running" && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <LoaderCircle className="size-8 animate-spin text-accent" />
          <p className="mt-5 font-display text-2xl font-medium">{scanName || "Starting scan"}</p>
          <div className="mt-8 text-sm text-muted">
            Matching {Math.min(scanIndex + 1, scanTotal)} of {scanTotal}
          </div>
          <div className="mt-4 h-1 w-full max-w-xs overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${scanTotal ? (scanIndex / scanTotal) * 100 : 8}%` }}
            />
          </div>
        </div>
      )}

      {phase === "empty" && (
        <div className="flex flex-1 flex-col px-5 pb-6 pt-8">
          <h2 className="font-display text-3xl font-medium tracking-tight">No company contacts found</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {stats.total.toLocaleString()} contacts are in Crest. Google and iPhone books are
            mostly people — someone who works at Google is not the Google company card.
            Open a company, tap Treat as a company, then scan again. Or add the firm by hand.
          </p>
          <div className="mt-auto flex flex-col gap-2">
            <Button size="lg" onClick={() => setView("add")}>
              Add a company
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setView("home")}>
              Browse contacts
            </Button>
          </div>
        </div>
      )}

      {phase === "review" && current && (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex flex-1 flex-col items-center">
            <ContactAvatar contact={current.contact} size="hero" preview={current.preview} />
            <h2 className="mt-5 text-center font-display text-2xl font-medium tracking-tight">
              {current.contact.name}
            </h2>
            {current.settled ? (
              <p className="mt-1 text-sm font-medium text-sage">Approved — this is how it will look</p>
            ) : hasExistingPhoto(current.contact) ? (
              <p className="mt-1 max-w-xs text-center text-sm text-muted">
                Already has a photo. This is only a suggestion — the current picture stays
                unless you replace it.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {current.failed
                  ? "No mark in the library yet"
                  : `${current.domain ?? ""} · ${sourceLabel(current.source ?? "")}${
                      viaLabel(current.via) ? ` · ${viaLabel(current.via)}` : ""
                    }`}
              </p>
            )}
            {hasExistingPhoto(current.contact) && current.contact.photoDataUrl && !current.settled && (
              <div className="mt-4 flex items-center gap-2 rounded-full bg-surface px-2 py-1.5 ring-1 ring-line">
                <img
                  src={current.contact.photoDataUrl}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
                <span className="pr-2 text-xs text-muted">Current photo</span>
              </div>
            )}
          </div>
          {current.settled ? (
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={advance}>
                {index + 1 >= queue.length ? "Finish" : "Next company"}
              </Button>
              <ReviewActions
                onRetry={current.domain ? () => void retry() : undefined}
                onUpload={(file) => void upload(file)}
                onCancel={cancel}
                retryDisabled={!current.domain || busy}
                busy={busy}
                cancelLabel="Skip this one"
              />
            </div>
          ) : (
            <ReviewActions
              onApprove={current.preview ? approve : undefined}
              onRetry={current.domain ? () => void retry() : undefined}
              onUpload={(file) => void upload(file)}
              onCancel={cancel}
              approveLabel={hasExistingPhoto(current.contact) ? "Replace photo" : "Approve"}
              approveDisabled={!current.preview}
              retryDisabled={!current.domain || busy}
              busy={busy}
              cancelLabel={hasExistingPhoto(current.contact) ? "Keep current photo" : "Skip this one"}
            />
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-1 flex-col px-5 pb-6 pt-8">
          <div className="grid size-14 place-items-center rounded-full bg-sage/12 text-sage">
            <Check className="size-7" />
          </div>
          <h2 className="mt-5 font-display text-3xl font-medium tracking-tight">
            {approved} photo{approved === 1 ? "" : "s"} approved
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{copy.save}</p>
          <div className="mt-auto flex flex-col gap-2">
            <Button size="lg" onClick={() => void saveToPhone()}>
              Save to Contacts
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setView("home")}>
              Back to address book
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ n, children }: { n: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xs font-medium text-accent">
        {n}
      </span>
      <span className="pt-1.5">{children}</span>
    </li>
  );
}
