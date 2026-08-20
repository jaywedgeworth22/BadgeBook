import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCrest } from "@/store/crest";

export function AddContact() {
  const addContact = useCrest((s) => s.addContact);
  const setView = useCrest((s) => s.setView);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("A name is required.");
      return;
    }
    addContact({
      name: trimmed,
      organization: organization.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      kind: "auto",
      source: "manual",
    });
    toast.success("Contact added");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button variant="ghost" size="icon" onClick={() => setView("home")} aria-label="Back">
          <ChevronLeft />
        </Button>
        <h1 className="font-display text-xl font-medium tracking-tight">New contact</h1>
      </header>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-4">
        <Field label="Name" value={name} onChange={setName} placeholder="Apple Inc" autoFocus />
        <Field label="Company" value={organization} onChange={setOrganization} placeholder="Same as name for firms" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="billing@company.com" type="email" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="1 (800) 000-0000" type="tel" />
        <Field label="Website" value={website} onChange={setWebsite} placeholder="company.com" />
        <p className="text-xs leading-relaxed text-muted">
          If this is a company, fill the company field. Crest can match a logo
          from the website, work email, company name, or phone — email is not required.
        </p>
        <div className="mt-auto">
          <Button type="submit" size="lg" className="w-full">
            Add to address book
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        autoFocus={autoFocus}
      />
    </div>
  );
}
