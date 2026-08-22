export type DeviceKind = "ios" | "android" | "desktop";

export function deviceKind(): DeviceKind {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function platformCopy(kind: DeviceKind = deviceKind()) {
  if (kind === "ios") {
    return {
      title: "iPhone & iPad",
      import:
        "In Contacts, select the companies → Share → Export vCard. Open that file here, or use Import contact card below.",
      save:
        "Crest first saves a backup card. Then open the new card — iOS offers to add each company with its photo.",
      install: "Share → Add to Home Screen. Crest then opens like an app.",
    };
  }
  if (kind === "android") {
    return {
      title: "Android",
      import:
        "Use Import from this phone to pick contacts, or Import contact card if you already exported a .vcf.",
      save:
        "Crest writes a backup first. Then open the new card to add the photos in Contacts.",
      install: "Chrome menu → Add to Home screen / Install app.",
    };
  }
  return {
    title: "Web",
    import:
      "Import a .vcf from your phone (AirDrop, email, or Files), or add companies by hand. On Android Chrome you can also pick contacts directly.",
    save:
      "Download the backup, then the updated contact card. Open the card on the phone to write photos into Contacts.",
    install: "Install Crest from the browser menu, or keep using it as a website.",
  };
}
