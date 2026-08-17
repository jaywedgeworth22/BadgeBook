import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
page.on("pageerror", (e) => console.log("PAGEERROR", e));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const result = await page.evaluate(async () => {
  const out = {};
  try {
    const r = await fetch("/api/logo?domain=apple.com");
    out.fetch = { ok: r.ok, status: r.status, type: r.headers.get("content-type"), size: (await r.clone().arrayBuffer()).byteLength };
  } catch (e) {
    out.fetch = { error: String(e) };
  }
  try {
    const dataUrl = await new Promise(async (resolve, reject) => {
      const r = await fetch("/api/logo?domain=apple.com");
      const blob = await r.blob();
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).slice(0, 40) + "... len=" + String(reader.result).length);
      reader.onerror = () => reject(new Error("reader"));
      reader.readAsDataURL(blob);
    });
    out.dataUrl = dataUrl;
  } catch (e) {
    out.dataUrl = String(e);
  }
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const src = "/api/logo?domain=apple.com";
    const loaded = await new Promise((resolve) => {
      img.onload = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ ok: false });
      img.src = src;
    });
    out.imgCors = loaded;
  } catch (e) {
    out.imgCors = String(e);
  }
  try {
    const img = new Image();
    const loaded = await new Promise((resolve) => {
      img.onload = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ ok: false });
      img.src = "/api/logo?domain=apple.com";
    });
    out.imgPlain = loaded;
  } catch (e) {
    out.imgPlain = String(e);
  }
  return out;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
