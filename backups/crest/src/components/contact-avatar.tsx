import { Building2 } from "lucide-react";
import { classifyContact, initials, type Contact } from "@/lib/contacts";
import { cn } from "@/lib/utils";

export function ContactAvatar({
  contact,
  size = "md",
  preview,
}: {
  contact: Contact;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  preview?: string;
}) {
  const cls = classifyContact(contact);
  const src = preview || contact.photoDataUrl;
  const dim =
    size === "sm"
      ? "size-10 text-xs"
      : size === "lg"
        ? "size-16 text-lg"
        : size === "xl"
          ? "size-28 text-2xl"
          : size === "hero"
            ? "size-36 text-3xl shadow-photo"
            : "size-12 text-sm";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-line", dim)}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full ring-1 ring-line",
        dim,
        cls.isCompany ? "bg-accent text-accent-fg" : "bg-surface text-muted",
      )}
      aria-hidden
    >
      {cls.isCompany ? <Building2 className={size === "hero" || size === "xl" ? "size-8" : size === "lg" ? "size-6" : "size-4"} /> : initials(contact.name)}
    </span>
  );
}
