import {
  classifyContact,
  type BookContact,
} from "./engine/classify.ts";
import { looksLikeContactCsv, parseGoogleCsv } from "./engine/csv.ts";
import { composeFromFile, sourceLabel, viaLabel } from "./engine/logos.ts";
import { bucket, matchBook, type ReviewItem } from "./engine/match.ts";
import { backupFilename, contactsToVcard, downloadText, parseVcard } from "./engine/vcard.ts";

type State = {
  contacts: BookContact[];
  items: ReviewItem[];
  stage: "idle" | "review";
  notice: string;
};

const state: State = {
  contacts: [],
  items: [],
  stage: "idle",
  notice: "",
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...kids: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const kid of kids) node.append(kid);
  return node;
}

function importText(name: string, text: string) {
  const contacts = name.toLowerCase().endsWith(".csv") || looksLikeContactCsv(text)
    ? parseGoogleCsv(text)
    : parseVcard(text);
  if (contacts.length === 0) {
    state.notice = "No contacts found in that file.";
    render();
    return;
  }
  state.contacts = contacts;
  state.items = matchBook(contacts);
  state.stage = "review";
  state.notice = `Imported ${contacts.length} contact${contacts.length === 1 ? "" : "s"}. Review every logo before download.`;
  render();
}

async function importFile(file: File) {
  state.notice = `Reading ${file.name}…`;
  render();
  const text = await file.text();
  importText(file.name, text);
}

function applySelected(): BookContact[] {
  const byId = new Map(state.contacts.map((c) => [c.id, { ...c }]));
  for (const item of state.items) {
    if (!item.selected) continue;
    const hit = item.candidates[item.chosenIndex];
    if (!hit) continue;
    const next = byId.get(item.contact.id);
    if (next) next.photoDataUrl = hit.src;
  }
  return [...byId.values()];
}

function downloadBackup() {
  downloadText(backupFilename(), contactsToVcard(state.contacts), "text/vcard;charset=utf-8");
}

function downloadUpdated() {
  downloadText("badgebook-contacts.vcf", contactsToVcard(applySelected()), "text/vcard;charset=utf-8");
}

function setAllHigh(selected: boolean) {
  for (const item of state.items) {
    if (item.confidence === "high") item.selected = selected;
  }
  render();
}

async function uploadFor(item: ReviewItem, file: File) {
  const src = await composeFromFile(file);
  item.candidates = [{ src, source: "upload", kind: "icon" }, ...item.candidates];
  item.chosenIndex = 0;
  item.selected = true;
  item.confidence = "high";
  item.flags = item.flags.filter((f) => f !== "non-brand");
  render();
}

function card(item: ReviewItem): HTMLElement {
  const hit = item.candidates[item.chosenIndex];
  const thumb = hit
    ? el("img", { class: "thumb", src: hit.src, alt: item.contact.displayName })
    : el("div", { class: "noimg" }, "?");
  const check = el("input", { type: "checkbox" }) as HTMLInputElement;
  check.checked = item.selected;
  check.disabled = item.candidates.length === 0;
  check.addEventListener("change", () => {
    item.selected = check.checked;
  });

  const alts = el("div", { class: "alts" });
  item.candidates.forEach((cand, i) => {
    const b = el("button", { class: i === item.chosenIndex ? "on" : "", type: "button" });
    b.append(el("img", { src: cand.src, alt: cand.source }));
    b.addEventListener("click", () => {
      item.chosenIndex = i;
      item.selected = true;
      render();
    });
    alts.append(b);
  });

  const upload = el("input", { type: "file", accept: "image/*", class: "hidden" }) as HTMLInputElement;
  upload.addEventListener("change", () => {
    const file = upload.files?.[0];
    if (file) void uploadFor(item, file);
    upload.value = "";
  });
  const uploadBtn = el("button", { class: "btn secondary", type: "button" }, "Upload");
  uploadBtn.addEventListener("click", () => upload.click());
  const skip = el("button", { class: "btn ghost", type: "button" }, "Skip");
  skip.addEventListener("click", () => {
    item.selected = false;
    render();
  });

  const via = viaLabel(item.via);
  const source = hit ? sourceLabel(hit.source) : "none";
  return el(
    "article",
    { class: `card ${item.confidence}` },
    check,
    thumb,
    el(
      "div",
      {},
      el("div", { class: "name" }, item.contact.displayName),
      el(
        "div",
        { class: "meta" },
        `${item.confidence} · ${source}${via ? ` · ${via}` : ""}${item.flags.length ? ` · ${item.flags.join(", ")}` : ""}`,
      ),
      alts,
      el("div", { class: "actions" }, uploadBtn, skip, upload),
    ),
  );
}

function section(title: string, items: ReviewItem[]): HTMLElement {
  const wrap = el("section", { class: "section" }, el("h2", {}, `${title} (${items.length})`));
  const grid = el("div", { class: "grid" });
  for (const item of items) grid.append(card(item));
  wrap.append(grid);
  return wrap;
}

export function render() {
  const root = document.getElementById("app");
  if (!root) return;
  root.replaceChildren();

  const app = el("div", { class: "app" });
  app.append(
    el(
      "header",
      { class: "hero" },
      el("h1", {}, "BadgeBook"),
      el(
        "p",
        {},
        "Brand icons for your address book. Upload a vCard or Google CSV, review every match, then download an updated card. Existing photos are never replaced unless you check the box.",
      ),
    ),
  );

  const file = el("input", { type: "file", accept: ".vcf,.vcard,.csv,text/vcard,text/csv", class: "hidden" }) as HTMLInputElement;
  file.addEventListener("change", () => {
    const f = file.files?.[0];
    if (f) void importFile(f);
    file.value = "";
  });
  const pick = el("button", { class: "btn", type: "button" }, "Import vCard or CSV");
  pick.addEventListener("click", () => file.click());

  const drop = el(
    "div",
    { class: "drop" },
    el("div", {}, el("strong", {}, "Import an address book"), el("span", {}, "Contacts stay in this browser. Nothing is uploaded to a server.")),
    pick,
    file,
  );
  drop.addEventListener("dragover", (e) => e.preventDefault());
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f) void importFile(f);
  });
  app.append(drop);
  if (state.notice) app.append(el("p", { class: "meta" }, state.notice));

  if (state.stage === "review") {
    const groups = bucket(state.items);
    const people = state.contacts.filter((c) => classifyContact(c) === "person").length;
    app.append(
      el(
        "div",
        { class: "stats" },
        el("div", { class: "stat high" }, el("b", {}, String(groups.auto.length)), " Ready to apply"),
        el("div", { class: "stat medium" }, el("b", {}, String(groups.review.length)), " Needs review"),
        el("div", { class: "stat skip" }, el("b", {}, String(groups.notFound.length)), " Not a brand / not found"),
        el("div", { class: "stat" }, el("b", {}, String(people)), " People left alone"),
      ),
    );
    const selectHigh = el("button", { class: "btn secondary", type: "button" }, "Select all high-confidence");
    selectHigh.addEventListener("click", () => setAllHigh(true));
    const clearHigh = el("button", { class: "btn ghost", type: "button" }, "Clear high-confidence");
    clearHigh.addEventListener("click", () => setAllHigh(false));
    const backup = el("button", { class: "btn secondary", type: "button" }, "Download backup");
    backup.addEventListener("click", downloadBackup);
    const save = el("button", { class: "btn", type: "button" }, "Download approved vCard");
    save.addEventListener("click", downloadUpdated);
    app.append(el("div", { class: "toolbar" }, selectHigh, clearHigh, backup, save));
    app.append(section("Ready to apply", groups.auto));
    app.append(section("Needs review", groups.review));
    app.append(section("Not found / not a brand", groups.notFound));
  }

  app.append(
    el(
      "p",
      { class: "footer" },
      "Review-first: high-confidence matches are pre-checked; guessed domains and favicons stay in review. Crest's company catalog, phone directory, and iconic-mark sources power the suggestions. Native macOS and iOS apps use the same rules in BadgeBookKit.",
    ),
  );
  root.append(app);
}
