import { useState } from "react";
import { ChevronLeft, LoaderCircle, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/contact-avatar";
import { ReviewActions } from "@/components/review-actions";
import { Badge } from "@/components/ui/badge";
import { classifyContact, hasExistingPhoto } from "@/lib/contacts";
import { resolveContactIdentity } from "@/lib/identity";
import { composeContactPhoto, composeFromFile, sourceLabel, uploadLogoToLibrary } from "@/lib/logos";
import { backupFilename, contactToVcard, contactsToVcard, downloadVcard, shareVcard } from "@/lib/vcard";
import { useCrest } from "@/store/crest";

export function ContactDetail() {
  const id = useCrest((s) => s.selectedId);
  const contact = useCrest((s) => s.contacts.find((c) => c.id === id));
  const setView = useCrest((s) => s.setView);
  const applyPhoto = useCrest((s) => s.applyPhoto);
  const setProposed = useCrest((s) => s.setProposed);
  const rejectSource = useCrest((s) => s.rejectSource);
  const clearPhoto = useCrest((s) => s.clearPhoto);
  const setKind = useCrest((s) => s.setKind);
  const removeContact = useCrest((s) => s.removeContact);
  const createBackup = useCrest((s) => s.createBackup);
  const [busy, setBusy] = useState(false);
  const [justApproved, setJustApproved] = useState(false);

  if (!contact) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setView("home")}>
          Back
        </Button>
        <p className="mt-4 text-muted">This contact is gone.</p>
      </div>
    );
  }

  const person = contact;
  const cls = classifyContact(person);
  const skip = person.rejectedSources ?? [];
  const replacing = hasExistingPhoto(person);
  const needsFill = cls.isCompany && !person.photoDataUrl && !person.hadExistingPhoto && !person.crestApplied;

  async function fetchLogo(extraSkip: string[] = []) {
    setBusy(true);
    setJustApproved(false);
    try {
      const identity = cls.domain
        ? { domain: cls.domain, via: "catalog" as const }
        : await resolveContactIdentity(person);
      if (!identity?.domain) {
        toast.error("Couldn’t match this card by name or phone. Add a website, or upload a mark.");
        return;
      }
      const photo = await composeContactPhoto(identity.domain, [...skip, ...extraSkip], person.name);
      setProposed(person.id, photo.dataUrl, identity.domain, photo.source);
      toast.success(
        photo.cached ? "From the mark library" : `Found via ${sourceLabel(photo.source)}`,
      );
    } catch {
      toast.error("No other mark for this company. Upload one instead.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!person.proposedPhotoUrl) {
      await fetchLogo();
      const latest = useCrest.getState().contacts.find((c) => c.id === person.id);
      if (!latest?.proposedPhotoUrl) return;
      applyPhoto(latest.id, latest.proposedPhotoUrl, latest.proposedDomain, latest.proposedSource);
      setJustApproved(true);
      toast.success("Approved — this is how it will look");
      return;
    }
    applyPhoto(person.id, person.proposedPhotoUrl, person.proposedDomain, person.proposedSource);
    setJustApproved(true);
    toast.success("Approved — this is how it will look");
  }

  async function retry() {
    const current = person.proposedSource;
    if (current) rejectSource(person.id, current);
    setJustApproved(false);
    await fetchLogo(current ? [current] : []);
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const composed = await composeFromFile(file);
      if (cls.domain) {
        try {
          await uploadLogoToLibrary(cls.domain, composed.original);
        } catch {
          /* still apply locally */
        }
      }
      applyPhoto(person.id, composed.preview, cls.domain, "upload");
      setJustApproved(true);
      toast.success("Approved — this is how it will look");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!person.crestApplied && person.hadExistingPhoto) {
      toast.success("Suggestion kept in Crest only. The photo already on this contact was not changed.");
      return;
    }
    const backup = createBackup("before-save");
    downloadVcard(backupFilename(), contactsToVcard(backup.contacts));
    try {
      await shareVcard(`${person.name}.vcf`, contactToVcard(person));
      toast.success("Backup saved. Open the card to add it to Contacts.");
    } catch {
      toast.error("Save was cancelled. Your backup is still on this device.");
    }
  }

  const preview =
    person.proposedPhotoUrl && person.proposedPhotoUrl !== person.photoDataUrl
      ? person.proposedPhotoUrl
      : undefined;

  const sourceLabelText =
    person.source === "device"
      ? "This phone"
      : person.source === "sample"
        ? "Sample book"
        : person.source === "google"
          ? "Google Contacts"
          : person.source === "import"
          ? "Contact card"
          : "Added in Crest";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => setView("home")} aria-label="Back">
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete contact"
          onClick={() => {
            removeContact(person.id);
            toast("Contact removed from Crest");
          }}
        >
          <Trash2 />
        </Button>
      </header>
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-8">
        <ContactAvatar contact={person} size="hero" preview={preview} />
        <h1 className="mt-4 text-center font-display text-3xl font-medium tracking-tight">
          {person.name}
        </h1>
        {person.organization && person.organization !== person.name && (
          <p className="mt-1 text-sm text-muted">{person.organization}</p>
        )}
        {justApproved && (
          <p className="mt-2 text-sm font-medium text-sage">Approved — this is how it will look</p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          <Badge tone={cls.isCompany ? "accent" : "default"}>
            {cls.isCompany ? "Company" : "Person"}
          </Badge>
          {person.crestApplied && <Badge tone="sage">Photo applied</Badge>}
          {hasExistingPhoto(person) && <Badge>Has a photo</Badge>}
          {cls.isCompany && needsFill && <Badge tone="rose">Needs photo</Badge>}
          {(person.proposedSource || person.photoDataUrl) && cls.isCompany && (
            <Badge>{sourceLabel(person.proposedSource ?? "upload")}</Badge>
          )}
        </div>

        <dl className="mt-8 w-full divide-y divide-line overflow-hidden rounded-xl bg-elevated shadow-card">
          {person.email && <Row label="Email" value={person.email} />}
          {person.phone && <Row label="Phone" value={person.phone} />}
          {(person.website || cls.domain) && (
            <Row label="Domain" value={person.website || cls.domain || ""} />
          )}
          <Row label="Source" value={sourceLabelText} />
        </dl>

        {cls.isCompany && cls.reasons.length > 0 && (
          <div className="mt-5 w-full rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Why this is a company</p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {cls.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {cls.isCompany && (
          <div className="mt-6 w-full">
            <ReviewActions
              onApprove={() => void approve()}
              onRetry={() => void retry()}
              onUpload={(file) => void upload(file)}
              onCancel={() => {
                if (replacing) {
                  setJustApproved(false);
                  toast("Kept the photo already on this contact");
                  return;
                }
                clearPhoto(person.id);
                setJustApproved(false);
                toast("Photo cleared");
              }}
              approveLabel={replacing ? "Replace photo" : person.photoDataUrl ? "Keep this photo" : "Approve photo"}
              retryLabel="Try another"
              cancelLabel={replacing ? "Keep current photo" : "Remove photo"}
              retryDisabled={!cls.domain || busy}
              busy={busy}
            />
          </div>
        )}

        <div className="mt-3 flex w-full flex-col gap-2">
          {!cls.isCompany && (
            <Button size="lg" onClick={() => void fetchLogo()} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              Look up a logo
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={() => void save()}>
            <Share2 />
            Save to Contacts
          </Button>
          <Button
            variant="ghost"
            onClick={() => setKind(person.id, cls.isCompany ? "person" : "company")}
          >
            {cls.isCompany ? "Treat as a person" : "Treat as a company"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="truncate text-sm">{value}</dd>
    </div>
  );
}
