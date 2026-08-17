import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push("page " + String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console " + m.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

if (await page.getByRole("button", { name: "Continue" }).count()) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Open my address book" }).click();
  await page.waitForTimeout(400);
}

await page.screenshot({ path: "/workspace/screenshots/home.png" });

await page.getByRole("button", { name: /Fill company photos/ }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Scan \d+ compan/ }).click();

try {
  await page.getByText(/logo(s)? ready/i).waitFor({ timeout: 180000 });
} catch {
  console.log("TIMEOUT. Body:\n", await page.locator("body").innerText());
}
await page.screenshot({ path: "/workspace/screenshots/scan-review.png" });
console.log("REVIEW TEXT:\n", (await page.locator("body").innerText()).slice(0, 900));

const apply = page.getByRole("button", { name: /Apply \d+ photo/ });
if (await apply.count()) {
  await apply.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/scan-done.png" });
  console.log("DONE TEXT:\n", await page.locator("body").innerText());
}

const back = page.getByRole("button", { name: "Back to address book" });
if (await back.count()) {
  await back.click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: "/workspace/screenshots/home-filled.png" });

const first = page.locator("main button, ul li button").filter({ hasText: "Apple" }).first();
if (await first.count()) {
  await first.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/detail.png" });
}

// settings
const settings = page.getByRole("button", { name: "Settings" });
if (await settings.count()) {
  await settings.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/workspace/screenshots/settings.png" });
}

console.log("ERRORS:", errors);
await browser.close();
