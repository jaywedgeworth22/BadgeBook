import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const reqs = [];
page.on("response", (r) => {
  if (r.status() >= 400) reqs.push(r.status() + " " + r.url());
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
const result = await page.evaluate(async () => {
  async function compose(domain) {
    const res = await fetch(`/api/logo?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) throw new Error("fetch " + res.status);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("reader"));
      reader.readAsDataURL(blob);
    });
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("img"));
      i.src = dataUrl;
    });
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0,0,size,size);
    const pad = Math.round(size * 0.18);
    const box = size - pad * 2;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(box / iw, box / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (size-dw)/2, (size-dh)/2, dw, dh);
    return { ok: true, w: iw, h: ih, out: canvas.toDataURL("image/jpeg", 0.92).length };
  }
  const domains = ["apple.com", "stripe.com", "delta.com", "homedepot.com"];
  const results = {};
  for (const d of domains) {
    try { results[d] = await compose(d); }
    catch (e) { results[d] = { error: String(e) }; }
  }
  return results;
});
console.log(JSON.stringify(result, null, 2));
console.log("BAD RESPONSES", reqs);
await browser.close();
